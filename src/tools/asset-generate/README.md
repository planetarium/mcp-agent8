# Asset Generation Tools

This module provides tools for generating game assets, including static images, cinematic sequences, audio, and skybox environments.

## Tools Overview

### Image Asset Generation

- `ImageAssetGeneratorTool`: Generates game assets based on provided context

### Cinematic Generation

- `CinematicAssetGeneratorTool`: Creates high-quality game cinematics
- `CinematicAssetResultTool`: Retrieves results from cinematic generation
- `CinematicStatusTool`: Checks status of cinematic generation requests
- `CinematicWaitTool`: Provides a waiting utility between status checks (recommended 30 seconds)

### Audio Generation

- `MusicGeneratorTool`: Creates music tracks based on text descriptions
- `SoundEffectsGeneratorTool`: Creates sound effects based on text descriptions
- `AudioStatusTool`: Checks the status of audio generation
- `AudioResultTool`: Retrieves the result of completed audio generation
- `AudioWaitTool`: Allows waiting for audio generation to complete (recommended 10s for music, 5s for SFX)

### Skybox Generation

- `SkyboxGeneratorTool`: Creates panoramic skybox environments based on prompts
- `SkyboxStatusTool`: Checks status of skybox generation requests
- `SkyboxWaitTool`: Provides a waiting utility between status checks
- `SkyboxStylesTool`: Lists available skybox generation styles

## Usage

```typescript
import {
  // Image tools
  ImageAssetGeneratorTool,

  // Cinematic tools
  CinematicAssetGeneratorTool,
  CinematicStatusTool,
  CinematicWaitTool,

  // Audio tools
  MusicGeneratorTool,
  SoundEffectsGeneratorTool,
  AudioStatusTool,
  AudioResultTool,
  AudioWaitTool,

  // Skybox tools
  SkyboxGeneratorTool,
  SkyboxStatusTool,
  SkyboxWaitTool,
  SkyboxStylesTool,
} from './tools/asset-generate';

// Initialize tools
const imageGenerator = new ImageAssetGeneratorTool();
const cinematicGenerator = new CinematicAssetGeneratorTool();
const cinematicStatus = new CinematicStatusTool();
const cinematicWait = new CinematicWaitTool();
const musicGenerator = new MusicGeneratorTool();
const sfxGenerator = new SoundEffectsGeneratorTool();
const audioStatus = new AudioStatusTool();
const audioWait = new AudioWaitTool();
const skyboxGenerator = new SkyboxGeneratorTool();
const skyboxStatus = new SkyboxStatusTool();

// Generate image asset
await imageGenerator.execute({
  context: 'Fantasy RPG game scene with a castle',
  style: 'Pixel art, 16-bit style',
});

// Generate music with status checking
const musicResult = await musicGenerator.execute({
  prompt: 'Epic orchestral theme with dramatic strings and percussion',
  duration: 30,
});

// For queued audio generation, check status with waiting
let audioComplete = false;
while (!audioComplete) {
  await audioWait.execute({ seconds: 10 });
  const statusResult = await audioStatus.execute({
    request_id: musicResult.request_id,
    model: 'cassetteai/music-generator',
  });
  if (statusResult.status === 'COMPLETED') {
    audioComplete = true;
  }
}

// Generate skybox with status checking
const skyboxResult = await skyboxGenerator.execute({
  prompt: 'Stunning sunset over mountains with dramatic clouds',
  style: 'realistic',
  negative_prompt: 'buildings, people, distortion',
});

// Wait and check status for skybox
let skyboxComplete = false;
while (!skyboxComplete) {
  await skyboxWait.execute({ seconds: 20 });
  const statusResult = await skyboxStatus.execute({ skybox_id: skyboxResult.skybox_id });
  if (statusResult.is_complete) {
    skyboxComplete = true;
  }
}
```

## File Structure

```
asset-generate/
├── common/           # Shared utilities and types
├── image/            # 2D image asset generation
├── cinematic/        # Cinematic sequence generation
├── audio/            # Audio asset generation
│   ├── music/        # Music track generation
│   └── sfx/          # Sound effects generation
├── skybox/           # Skybox environment generation
└── index.ts          # Main export file
```

## Technical Details

These tools use various AI generation APIs while providing a game development-focused interface. All tools support progress callbacks and provide detailed error information when things go wrong.

### Common Architecture

The tools share these common components:

- **AssetGeneratorBase**: Base class for all asset generators
- **AssetResultBase**: Base class for all result retrieval tools
- **Common Utilities**: Authentication, request processing, parameter validation, etc.

## Requirements

- API keys set in the respective environment variables
- Node.js with ES modules support
- Internet connection for API access

## Migration from Existing Tools

This unified asset generation toolset replaces the previous asset-generator and cinematic tools, providing a more consistent and extensible interface. All existing functionality is maintained while being enhanced with improved features.

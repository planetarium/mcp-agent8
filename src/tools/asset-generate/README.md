# Asset Generation Tools

This module provides tools for generating game assets, including static images and cinematic sequences.

## Tools Overview

### Image Asset Generation

- `ImageAssetGeneratorTool`: Generates game assets based on provided context

### Cinematic Generation

- `CinematicAssetGeneratorTool`: Creates high-quality game cinematics
- `CinematicAssetResultTool`: Retrieves results from cinematic generation
- `CinematicStatusTool`: Checks status of cinematic generation requests
- `CinematicWaitTool`: Provides a waiting utility between status checks (recommended 30 seconds)

## Usage

```typescript
import {
  ImageAssetGeneratorTool,
  CinematicAssetGeneratorTool,
  CinematicStatusTool,
  CinematicWaitTool,
} from './tools/asset-generate';

// Initialize tools
const staticGenerator = new ImageAssetGeneratorTool();
const cinematicGenerator = new CinematicAssetGeneratorTool();
const cinematicStatus = new CinematicStatusTool();
const cinematicWait = new CinematicWaitTool();

// Generate assets
await staticGenerator.execute({
  context: 'Fantasy RPG game scene with a castle',
  style: 'Pixel art, 16-bit style',
});

// Generate cinematic with status checking
const result = await cinematicGenerator.execute({
  prompt: 'Epic battle scene between hero and dragon',
  reference_image_urls: ['url-to-reference-image'],
  aspect_ratio: '16:9',
});

// For queued cinematic generations, check status with waiting
const queueUrl = result.url; // URL returned from the original request
let isComplete = false;

while (!isComplete) {
  // Check current status
  const statusResult = await cinematicStatus.execute({ url: queueUrl });

  // If complete, break out of loop
  if (statusResult.status === 'COMPLETED') {
    isComplete = true;
    break;
  }

  // Wait 30 seconds before checking again
  await cinematicWait.execute({ seconds: 30 });
}
```

## File Structure

```
asset-generate/
├── common/           # Shared utilities and types
├── image/            # 2D image asset generation
├── cinematic/        # Cinematic sequence generation
└── index.ts          # Main export file
```

## Technical Details

These tools use the fal.ai API while providing a more game development-focused interface. All tools support progress callbacks and provide detailed error information when things go wrong.

### Common Architecture

The tools share these common components:

- **AssetGeneratorBase**: Base class for all asset generators
- **AssetResultBase**: Base class for all result retrieval tools
- **Common Utilities**: Authentication, request processing, parameter validation, etc.

## Requirements

- API key set in the environment variable `FAL_KEY`
- Node.js with ES modules support
- Internet connection for API access

## Migration from Existing Tools

This unified asset generation toolset replaces the previous asset-generator and cinematic tools, providing a more consistent and extensible interface. All existing functionality is maintained while being enhanced with improved features.

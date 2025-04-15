# Asset Generation Tools

This module provides tools for generating game assets, including static images and cinematic sequences.

## Tools Overview

### Static Asset Generation

- `StaticAssetGeneratorTool`: Generates game assets based on provided context

### Cinematic Generation

- `CinematicAssetGeneratorTool`: Creates high-quality game cinematics
- `CinematicAssetResultTool`: Retrieves results from cinematic generation
- `CinematicStatusTool`: Checks status of cinematic generation requests

## Usage

```typescript
import { StaticAssetGeneratorTool, CinematicAssetGeneratorTool } from './tools/asset-generate';

// Initialize tools
const staticGenerator = new StaticAssetGeneratorTool();
const cinematicGenerator = new CinematicAssetGeneratorTool();

// Generate assets
await staticGenerator.execute({
  context: 'Fantasy RPG game scene with a castle',
  style: 'Pixel art, 16-bit style',
});

await cinematicGenerator.execute({
  context: 'Epic battle scene between hero and dragon',
  references: ['url-to-reference-image'],
  duration: 10,
});
```

## File Structure

```
asset-generate/
├── common/           # Shared utilities and types
├── static/           # Static image generation
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

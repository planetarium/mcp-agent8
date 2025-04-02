# Cinematic Tools for Game Development

This directory contains a set of tools for generating and managing game cinematics using AI models.

## Overview

The cinematic tools replace the previous fal.ai tools with a more specialized set of utilities
focused on game cinematic generation. These tools help game developers create high-quality
cinematics, cutscenes, trailers, and other visual assets for their games.

## Available Tools

### Cinematic Generation

- **GameCinematicGeneratorTool**: Generates cinematic scenes based on game context and reference images
- **CinematicResultTool**: Retrieves results from queued cinematic generation requests
- **CinematicStatusTool**: Checks the status of queued cinematic generation requests
- **CinematicCancelTool**: Cancels in-progress cinematic generation requests

### Model Management

- **CinematicModelsListTool**: Lists available AI models suitable for cinematic generation
- **CinematicModelsSearchTool**: Searches for cinematic models based on keywords
- **CinematicModelSchemaTool**: Gets detailed schema for a specific cinematic model

### Asset Management

- **CinematicUploadTool**: Uploads reference images and assets for cinematic generation

## Usage

These tools can be accessed through the Model Context Protocol interface. Here are some typical usage scenarios:

1. **Find suitable models**: Use `cinematic_models_list` or `cinematic_models_search` to discover models
2. **Upload reference assets**: Use `cinematic_upload` to add reference images for your cinematics
3. **Generate cinematics**: Use `game_cinematic_generate` to create cinematic sequences
4. **Check progress**: For queued requests, use `cinematic_status` to monitor generation progress
5. **Get results**: Once complete, use `cinematic_result` to retrieve the finished cinematic

## Technical Details

The tools use the fal.ai API under the hood but provide a more game-development-focused interface.
All tools support progress callbacks and provide detailed error information when things go wrong.

## Requirements

- API key set in the environment variable `FAL_KEY`
- Node.js with ES modules support
- Internet connection for API access

## Migration from fal.ai Tools

These tools completely replace the previous fal.ai tools with improved functionality
specifically designed for game development. All previous capabilities are maintained
but with enhanced features for cinematic creation.

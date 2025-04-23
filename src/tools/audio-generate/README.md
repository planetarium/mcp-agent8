# Audio Generation Tools

This directory contains tools for generating audio assets for games, including music and sound effects.

## Available Tools

### Music Generator

The `music_generate` tool creates music tracks based on text descriptions. It uses the cassetteai API to generate high-quality music that can be used for game background music, theme songs, and more.

**Features:**

- Generates 30-second music samples in about 2 seconds
- Creates full 3-minute tracks in under 10 seconds
- Produces 44.1 kHz stereo audio with professional consistency

**Usage:**

```json
{
  "prompt": "Smooth chill hip-hop beat with mellow piano melodies, deep bass, and soft drums, perfect for a night drive. Key: D Minor, Tempo: 90 BPM.",
  "duration": 50
}
```

### Sound Effects Generator

The `sfx_generate` tool creates sound effects based on text descriptions. It generates high-quality SFX suitable for game actions, environmental sounds, UI feedback, and more.

**Features:**

- Generates high-quality SFX up to 30 seconds long
- Creates realistic sound effects in just 1 second of processing time
- Professional consistency with no breaks or artifacts

**Usage:**

```json
{
  "prompt": "A magical spell casting sound with sparkling energy and a deep resonant whoosh",
  "duration": 3
}
```

### Audio Status Tool

The `audio_status` tool checks the status of a queued audio generation request. It allows you to verify if the audio generation has completed and get the result URL.

**Usage:**

```json
{
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "model": "cassetteai/music-generator"
}
```

### Audio Result Tool

The `audio_result` tool retrieves the final result of a completed audio generation request. It will also upload the audio file to the server and return a permanent URL.

**Usage:**

```json
{
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "model": "cassetteai/music-generator",
  "audio_type": "music"
}
```

### Audio Wait Tool

The `audio_wait` tool allows waiting for a specified number of seconds between status checks. This is useful for giving audio generation time to complete.

**Usage:**

```json
{
  "seconds": 10,
  "status_message": "Waiting for music generation..."
}
```

## Implementation

The tools are implemented using the common architecture pattern used throughout the codebase:

1. A base class (`AudioGeneratorBase`) that handles common functionality
2. Specific implementations for each tool type
3. Integration with the fal.ai API queue system for generation
4. Automatic upload of generated assets to the server
5. Status, result, and wait tools for handling asynchronous generations

## ⚠️ IMPORTANT: Avoiding Timeouts

**To prevent MCP timeouts, you MUST use the tools in the following sequence:**

1. **NEVER** wait for audio generation to complete within a single MCP call
2. The `music_generate` and `sfx_generate` tools ONLY submit requests to the queue and return a request_id
3. You MUST use the following workflow to get the actual audio file:
   - Call `audio_wait` to wait for the appropriate time (10s for music, 5s for SFX)
   - Call `audio_status` with the request_id to check if generation is complete
   - If status is "COMPLETED", use `audio_result` to get the final URL
   - If still processing, wait again and check status until complete

Failure to follow this workflow will result in an MCP timeout error (-32001).

## Recommended Workflow

1. Generate audio using `music_generate` or `sfx_generate` and get a `request_id`
2. Wait for a few seconds using `audio_wait` (10s for music, 5s for SFX)
3. Check generation status with `audio_status` using the `request_id`
4. If status is 'COMPLETED', use `audio_result` to get the final audio URL
5. If still processing, wait again and check status until complete

## Example Workflow

```
// Step 1: Generate audio and get request_id
music_generate({
  "prompt": "Epic orchestral theme with dramatic strings and percussion",
  "duration": 30
})
// Response: { "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b", ... }

// Step 2: Wait for generation to progress
audio_wait({
  "seconds": 10,
  "status_message": "Waiting for music generation..."
})

// Step 3: Check status using request_id
audio_status({
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "model": "cassetteai/music-generator"
})
// Response: { "status": "COMPLETED", ... } or { "status": "PROCESSING", ... }

// Step 4: If completed, get the result
audio_result({
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "model": "cassetteai/music-generator",
  "audio_type": "music"
})
// Response: { "url": "https://your-server.com/audio/music-12345.wav", ... }
```

## API Documentation

For more details on the underlying APIs:

- Music Generator API: https://fal.ai/models/cassetteai/music-generator/api
- Sound Effects Generator API: https://fal.ai/models/cassetteai/sound-effects-generator/api

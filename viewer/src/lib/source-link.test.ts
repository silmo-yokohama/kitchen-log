import { describe, it, expect } from 'vitest';
import { extractDomain, extractYouTubeId } from './source-link';

describe('extractDomain', () => {
  it('returns the hostname without www.', () => {
    expect(extractDomain('https://youtu.be/SPJFAtNWu2U')).toBe('youtu.be');
    expect(extractDomain('https://www.kurashiru.com/recipes/x')).toBe('kurashiru.com');
    expect(extractDomain('http://cookgo.life/share/3WWWXA')).toBe('cookgo.life');
  });
});

describe('extractYouTubeId', () => {
  it('extracts ids from the common url shapes', () => {
    expect(extractYouTubeId('https://youtu.be/SPJFAtNWu2U')).toBe('SPJFAtNWu2U');
    expect(extractYouTubeId('https://youtube.com/watch?v=MMzYq7-8SWc&si=9luovqCgRxckgjFl')).toBe('MMzYq7-8SWc');
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
    expect(extractYouTubeId('https://www.youtube.com/shorts/xyz789')).toBe('xyz789');
  });

  it('returns null for non-YouTube urls', () => {
    expect(extractYouTubeId('https://cookpad.com/recipe/1')).toBeNull();
    expect(extractYouTubeId('not a url')).toBeNull();
  });
});

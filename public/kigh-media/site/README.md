# KIGH Site Imagery

Place approved/safely-licensed imagery here. The site references these paths
directly. If a file is missing, the UI falls back to a tasteful gradient
backdrop with a subtle pattern, so it is safe to merge before the real assets
are uploaded.

## Expected files

```
public/kigh-media/site/
├── hero/
│   └── houston-downtown.jpg     # Wide Houston downtown skyline (recommended ~2400×1200)
└── community/
    ├── family-park.jpg          # Family/community moment at a park (recommended ~1600×1200)
    └── community-kids-park.jpg  # Children playing in a park (recommended ~1600×1200)
```

## Guidelines

- Use only photography that KIGH has rights to use (community-submitted with
  permission, owned by KIGH, or properly licensed).
- Do not hot-link copyrighted third-party images.
- Prefer JPG (≤ 400 KB) for photographic content; the layout is built for
  responsive `<img>` with `loading="lazy"` and graceful fallbacks.
- Keep faces of minors out of community imagery unless explicit, written
  consent has been obtained.

To replace an image, drop a new file at the same path with the same filename
— no code changes required.

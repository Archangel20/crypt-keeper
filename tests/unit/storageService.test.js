// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createStorageService, KEYS } from '../../src/services/storageService.js';
import {
  defaultSettings,
  isValidSettings,
  encode,
} from '../../src/logic/storageCodec.js';

function fakeStorage(opts = {}) {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (opts.failWrites) throw new Error('quota');
      map.set(k, v);
    },
    removeItem: (k) => map.delete(k),
  };
}

const svc = (s) => createStorageService(() => s);

describe('storageService.load', () => {
  it('returns defaults without error on missing key', () => {
    const s = fakeStorage();
    expect(svc(s).load('settings', defaultSettings, isValidSettings)).toEqual({
      value: defaultSettings,
    });
  });

  it('returns defaults on corrupt JSON and keeps the stored value', () => {
    const s = fakeStorage();
    s.map.set(KEYS.settings, '{nope');
    const res = svc(s).load('settings', defaultSettings, isValidSettings);
    expect(res.value).toBe(defaultSettings);
    expect(res.error).toBeTruthy();
    expect(s.map.get(KEYS.settings)).toBe('{nope');
  });

  it('returns defaults on invalid shape and keeps the stored value', () => {
    const s = fakeStorage();
    const text = encode({ studyMinutes: 999, breakMinutes: 5 }).text;
    s.map.set(KEYS.settings, text);
    const res = svc(s).load(KEYS.settings, defaultSettings, isValidSettings);
    expect(res.value).toBe(defaultSettings);
    expect(res.error).toBeTruthy();
    expect(s.map.get(KEYS.settings)).toBe(text);
  });

  it('returns defaults on unsupported version', () => {
    const s = fakeStorage();
    s.map.set(KEYS.settings, JSON.stringify({ version: 99, data: defaultSettings }));
    expect(svc(s).load('settings', defaultSettings, isValidSettings).value).toBe(
      defaultSettings,
    );
  });

  it('does not throw when storage is unavailable or getItem throws', () => {
    expect(svc(null).load('settings', defaultSettings).value).toBe(defaultSettings);
    const bad = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(svc(bad).load('settings', defaultSettings).value).toBe(defaultSettings);
    const throwingGetter = createStorageService(() => {
      throw new Error('denied');
    });
    expect(throwingGetter.load('settings', defaultSettings).value).toBe(
      defaultSettings,
    );
  });
});

describe('storageService.save', () => {
  it('saves under the prefixed key and round-trips', () => {
    const s = fakeStorage();
    const service = svc(s);
    const data = { studyMinutes: 30, breakMinutes: 10 };
    expect(service.save('settings', data)).toEqual({ ok: true });
    expect([...s.map.keys()]).toEqual(['cryptkeeper:settings']);
    expect(service.load('settings', defaultSettings, isValidSettings)).toEqual({
      value: data,
    });
  });

  it('returns ok:false instead of throwing when setItem throws', () => {
    const res = svc(fakeStorage({ failWrites: true })).save('settings', {});
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('returns ok:false when storage is missing', () => {
    expect(svc(null).save('settings', {}).ok).toBe(false);
  });
});

describe('storageService.isAvailable', () => {
  it('is true for working storage and leaves no probe key', () => {
    const s = fakeStorage();
    expect(svc(s).isAvailable()).toBe(true);
    expect(s.map.size).toBe(0);
  });

  it('is false when missing or writes fail', () => {
    expect(svc(null).isAvailable()).toBe(false);
    expect(svc(fakeStorage({ failWrites: true })).isAvailable()).toBe(false);
  });
});

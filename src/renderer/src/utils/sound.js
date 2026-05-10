export function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()

    const notes = type === 'focus'
      ? [
          { freq: 523.25, start: 0, duration: 0.75, volume: 0.28 },
          { freq: 659.25, start: 0.3, duration: 0.75, volume: 0.28 },
          { freq: 784, start: 0.6, duration: 1.1, volume: 0.32 },
        ]
      : [
          { freq: 440, start: 0, duration: 0.9, volume: 0.26 },
          { freq: 587.33, start: 0.45, duration: 0.95, volume: 0.24 },
        ]

    notes.forEach(({ freq, start, duration, volume }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    })
  } catch (_) {
    // AudioContext not available
  }
}

export function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()

    const notes = type === 'focus'
      ? [{ freq: 523.25, start: 0 }, { freq: 659.25, start: 0.15 }, { freq: 784, start: 0.3 }]
      : [{ freq: 440, start: 0 }]

    notes.forEach(({ freq, start }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.6)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.6)
    })
  } catch (_) {
    // AudioContext not available
  }
}

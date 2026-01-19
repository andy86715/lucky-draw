import wave
import math
import struct
import random
import os


def generate_tone(frequency=440, duration=0.1, volume=0.5, sample_rate=44100):
    n_samples = int(sample_rate * duration)
    data = []
    for i in range(n_samples):
        sine_val = math.sin(2.0 * math.pi * frequency * i / sample_rate)
        value = int(volume * 32767.0 * sine_val)
        data.append(value)
    return data


def generate_click():
    # Short, high pitch click
    data = []
    sample_rate = 44100
    duration = 0.05
    for i in range(int(sample_rate * duration)):
        # Decaying noise/high-freq for click
        envelope = 1.0 - (i / (sample_rate * duration))
        value = int(envelope * 10000.0 * (random.random() - 0.5))
        data.append(value)
    return data


def generate_win_fanfare():
    # Simple arpeggio: C E G C
    notes = [523.25, 659.25, 783.99, 1046.50]
    data = []
    sample_rate = 44100

    for freq in notes:
        # Each note 0.15s, overlapping slightly in feel
        n_samples = int(sample_rate * 0.15)
        for i in range(n_samples):
            # ADSR envelope
            t = i / n_samples
            if t < 0.1:
                envelope = t / 0.1
            elif t > 0.8:
                envelope = (1 - t) / 0.2
            else:
                envelope = 1.0

            sine_val = math.sin(2.0 * math.pi * freq * i / sample_rate)
            value = int(envelope * 0.3 * 32767.0 * sine_val)
            data.append(value)

    # Final chord hold
    final_duration = 1.0
    for i in range(int(sample_rate * final_duration)):
        t = i / (sample_rate * final_duration)
        envelope = 1.0 - t
        value = 0
        for freq in notes:
            sine_val = math.sin(2.0 * math.pi * freq * i / sample_rate)
            value += int(envelope * 0.1 * 32767.0 * sine_val)
        data.append(value)

    return data


def generate_congrats():
    # Longer, more complex fanfare
    # Triplet C E G, Triplet E G C, Hold High C
    notes = [
        (523.25, 0.1), (659.25, 0.1), (783.99, 0.1),  # Triplet 1
        (659.25, 0.1), (783.99, 0.1), (1046.50, 0.1),  # Triplet 2
        (1046.50, 0.6), (1318.51, 0.4)  # High C -> High E
    ]
    data = []
    sample_rate = 44100

    for freq, duration in notes:
        n_samples = int(sample_rate * duration)
        for i in range(n_samples):
            t = i / n_samples
            # Attack Decay Sustain Release (ADSR)
            if t < 0.1:
                envelope = t / 0.1
            elif t > 0.8:
                envelope = (1 - t) / 0.2
            else:
                envelope = 1.0

            # Add some harmonics for "brass" feel
            sine_val = math.sin(2.0 * math.pi * freq * i / sample_rate)
            harm1 = 0.5 * math.sin(
                2.0 * math.pi * (freq * 2) * i / sample_rate
            )
            harm2 = 0.25 * math.sin(
                2.0 * math.pi * (freq * 3) * i / sample_rate
            )

            val = sine_val + harm1 + harm2
            value = int(envelope * 0.2 * 32767.0 * val)
            data.append(value)

    return data


def save_wav(filename, data, sample_rate=44100):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.setnframes(len(data))
        for value in data:
            f.writeframes(struct.pack('<h', max(min(value, 32767), -32768)))


def main():
    output_dir = "public/sounds"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Generating click.wav...")
    click_data = generate_click()
    save_wav(f"{output_dir}/click.wav", click_data)

    print("Generating win.wav...")
    win_data = generate_win_fanfare()
    save_wav(f"{output_dir}/win.wav", win_data)

    print("Generating congrats.wav...")
    congrats_data = generate_congrats()
    save_wav(f"{output_dir}/congrats.wav", congrats_data)

    print("Done!")


if __name__ == "__main__":
    main()

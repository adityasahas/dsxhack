import librosa
import numpy as np
import requests
import io
from config import settings
from openai import OpenAI
from pydantic import BaseModel, Field

class EmotionOutput(BaseModel):
    """Structured output for music emotion classification with percentage distribution"""
    happy: float = Field(description="Percentage likelihood of Happy emotion (0-100)", ge=0.0, le=100.0)
    sad: float = Field(description="Percentage likelihood of Sad emotion (0-100)", ge=0.0, le=100.0)
    calm: float = Field(description="Percentage likelihood of Calm emotion (0-100)", ge=0.0, le=100.0)
    energetic: float = Field(description="Percentage likelihood of Energetic emotion (0-100)", ge=0.0, le=100.0)
    excited: float = Field(description="Percentage likelihood of Excited emotion (0-100)", ge=0.0, le=100.0)
    relaxed: float = Field(description="Percentage likelihood of Relaxed emotion (0-100)", ge=0.0, le=100.0)
    angry: float = Field(description="Percentage likelihood of Angry emotion (0-100)", ge=0.0, le=100.0)
    romantic: float = Field(description="Percentage likelihood of Romantic emotion (0-100)", ge=0.0, le=100.0)
    other: float = Field(description="Percentage likelihood of Other emotion (0-100)", ge=0.0, le=100.0)
    reasoning: str = Field(
        description="Brief explanation connecting the musical features to the emotion distribution"
    )



class Process:

    def __init__(self, url):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.url = url
        self.wave = None
        self.sr = None
        self.chunk1 = None
        self.energy = None
        self.key = None
        self.tempo = None
        self.emotions = []

    def process_waveform(self):   
        """Generator that yields chunk results as they're processed"""
        try: 
            response = requests.get(self.url)
            response.raise_for_status()
            audio_data = io.BytesIO(response.content)

            self.wave, self.sr = librosa.load(audio_data, sr = None)
            samples_per_chunk, hop_samples = self.chunk()
            
            total_chunks = (len(self.wave) - samples_per_chunk) // hop_samples
            chunk_number = 0
            
            for start in range(0, len(self.wave) - samples_per_chunk, hop_samples):
                end = start + samples_per_chunk
                chunk = self.wave[start:end]
                self.chunk1 = chunk
                
                self.energy = self.get_chunk_energy()
                self.tempo = self.get_chunk_tempo()
                self.key = self.get_chunk_major_minor()
                
                emotional_output = self.calculate_emotion()
                self.emotions.append(emotional_output)
                
                image_url = self.generate_emotion_image()
                
                chunk_number += 1
                
                yield {
                    "chunk_number": chunk_number,
                    "total_chunks": total_chunks,
                    "energy": float(self.energy),
                    "tempo": float(self.tempo),
                    "key": self.key,
                    "emotion": {
                        "happy": emotional_output.happy,
                        "sad": emotional_output.sad,
                        "calm": emotional_output.calm,
                        "energetic": emotional_output.energetic,
                        "excited": emotional_output.excited,
                        "relaxed": emotional_output.relaxed,
                        "angry": emotional_output.angry,
                        "romantic": emotional_output.romantic,
                        "other": emotional_output.other,
                        "reasoning": emotional_output.reasoning
                    },
                    "image_url": image_url
                }
                
        except Exception as e:
            yield {"error": f"Could not load file: {str(e)}"}
    #def get 
    def chunk(self):
        chunk_duration = 7.0
        hop_duration = 6.0          # overlap for smoother updates
        samples_per_chunk = int(chunk_duration * self.sr)
        hop_samples = int(hop_duration * self.sr)

        return samples_per_chunk, hop_samples
        
        # split everything up into 0.5 second chunks 
    def get_chunk_energy(self):
        """
        Compute the energy of one chunk of amplitudes.
        `chunk` is a list or numpy array of amplitude values.
        """
        if len(self.chunk1) == 0:
            return 0.0  # avoid division by zero
    
        energy = np.sum(np.square(self.chunk1)) / len(self.chunk1)
        return energy
    def get_chunk_tempo(self):
        # get the tempo from  one chunk of the audio file
        if len(self.chunk1) == 0:
            return 0.0  # avoid empty chunks

        # Compute onset strength (rhythmic intensity)
        onset_env = librosa.onset.onset_strength(y=self.chunk1, sr=self.sr)

        # Estimate tempo (returns array, so take first value)
        tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=self.sr)[0]

        return tempo
    
    def get_chunk_major_minor(self):
        """
        Determine if the current chunk (self.chunk1) is in a major or minor key.
        Returns a string like "C major" or "A minor".
        """
        if len(self.chunk1) == 0:
            return 0

    # Compute chroma features
        chroma = librosa.feature.chroma_cqt(y= self.chunk1, sr=self.sr)
        chroma_mean = np.mean(chroma, axis=1)  # average across time

        # Krumhansl major/minor key profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                                2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                                2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        # Compare chroma to all 12 key rotations
        major_corr = [np.corrcoef(np.roll(major_profile, i), chroma_mean)[0, 1] for i in range(12)]
        minor_corr = [np.corrcoef(np.roll(minor_profile, i), chroma_mean)[0, 1] for i in range(12)]

        # Determine the best match
        if max(major_corr) > max(minor_corr):
            key_index = np.argmax(major_corr)
            key_type = "major"
        else:
            key_index = np.argmax(minor_corr)
            key_type = "minor"

        return key_type
        
    def calculate_emotion(self) -> EmotionOutput:
        #Calculate the emotion of the current chunk using structured outputs. Returns an EmotionOutput object with percentage distribution for each emotion.
        
        prompt = f"""
        
            You are a music emotion classifier. 
    Your task is to classify the emotion of a song chunk based on the following features:

    - Energy (average amplitude squared): {self.energy}
    - Tempo (in BPM): {self.tempo}
    - Key (note and mode): {self.key}

    You must estimate the emotional composition of the music by assigning a percentage likelihood (0-100%) to each of the following emotion categories:
    Happy, Sad, Calm, Energetic, Excited, Relaxed, Angry, Romantic, Other.

    Instructions:
    1. The percentages must sum to **100%** across all emotions.
    2. Provide a **brief reasoning** that connects the musical features (energy, tempo, key) to the assigned emotion distribution.
    3. Return your response as a structured JSON with fields: happy, sad, calm, energetic, excited, relaxed, angry, romantic, other (all as floats), and reasoning (as a string)."""

        # Use OpenAI SDK with structured output
        completion = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a music emotion analysis expert."},
                {"role": "user", "content": prompt}
            ],
            response_format=EmotionOutput
        )
        
        result = completion.choices[0].message.parsed
        return result
    
    def generate_emotion_image(self, output_path: str = "emotion_visualization.png"):
        """
        Generate an image visualization based on the current chunk's emotion.
        Uses DALL-E to create an artistic representation.
        """
        if not self.energy or not self.tempo or not self.key:
            print("No chunk data calculated yet.")
            return None
        
        # Use current chunk's emotion data
        current_emotion = {
            "happy": 0, "sad": 0, "calm": 0, "energetic": 0,
            "excited": 0, "relaxed": 0, "angry": 0, "romantic": 0, "other": 0
        }
        
        if self.emotions:
            last_emotion = self.emotions[-1]
            current_emotion = {
                "happy": last_emotion.happy,
                "sad": last_emotion.sad,
                "calm": last_emotion.calm,
                "energetic": last_emotion.energetic,
                "excited": last_emotion.excited,
                "relaxed": last_emotion.relaxed,
                "angry": last_emotion.angry,
                "romantic": last_emotion.romantic,
                "other": last_emotion.other,
            }
        
        # Get top 3 emotions for this chunk
        sorted_emotions = sorted(current_emotion.items(), key=lambda x: x[1], reverse=True)
        dominant_emotions = [f"{e[0].capitalize()} ({e[1]:.1f}%)" for e in sorted_emotions[:3]]
        
        # Create a prompt for DALL-E
        emotions_str = ", ".join(dominant_emotions)
        
        dalle_prompt = f"""Create an abstract artistic visualization representing this musical moment. 
The dominant emotions are: {emotions_str}. 
Tempo: {self.tempo} BPM, Key: {self.key}, Energy: {self.energy:.4f}.
Use flowing colors, shapes, and patterns that evoke these feelings. 
Style: abstract, emotional, musical, flowing, vibrant."""
        
        try:
            # Generate image using DALL-E
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=dalle_prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
        
            
            return image_url
            
        except Exception as e:
            print(f"Error generating image: {e}")
            return None
    
if __name__ == "__main__":
    url = "https://audio.com/bee-music-finder/audio/spotidownloadercom-happy-from-despicable-me-2-pharrell-williams"
    processor = Process(url)
    processor.process_waveform()
    
    # Calculate emotion for the last chunk
    emotion_result = processor.calculate_emotion()
    print(emotion_result.json(indent=2))

    image_url = processor.generate_emotion_image()
    print("Generated image URL:", image_url)
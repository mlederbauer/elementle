import tkinter as tk
from tkinter import messagebox
import random
import pandas as pd

# Read 'Element' column from the csv file
elements_df = pd.read_csv('data/elements_simple.csv')
WORDS = elements_df['Element'].str.lower().tolist()

# Determine the maximum word length for GUI adjustments
MAX_WORD_LENGTH = max(map(len, WORDS))

def feedback(target, guess):
    """Provide feedback on the guessed word."""
    result = []
    used_indices = []  # Track indices in the target word that have already been matched
    
    for i in range(len(target)):
        if i >= len(guess):
            result.append('white')
        elif guess[i] == target[i]:
            result.append('green')
            used_indices.append(i)
        else:
            result.append('gray')  # Default to gray, might be updated to yellow later

    # Check for yellow feedback, ensuring not to double-count letters
    for i, char in enumerate(guess):
        if char in target and result[i] == 'gray':
            for idx, t_char in enumerate(target):
                if char == t_char and idx not in used_indices:
                    result[i] = 'yellow'
                    used_indices.append(idx)
                    break  # Exit once we've found a match that hasn't been used
                    
    return result


class WordleGame(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Wordle Game")
        self.geometry(f"{50 * MAX_WORD_LENGTH}x450")

        self.target_word = random.choice(WORDS)
        self.attempts = 0
        self.max_attempts = 6

        self.label = tk.Label(self, text=f"Attempt {self.attempts + 1}/{self.max_attempts}")
        self.label.pack(pady=20)

        self.entry = tk.Entry(self)
        self.entry.pack(pady=20)

        self.button = tk.Button(self, text="Guess", command=self.make_guess)
        self.button.pack(pady=20)

        # Frame to hold colored labels for guesses
        self.guess_frame = tk.Frame(self)
        self.guess_frame.pack(pady=20)
        
        # Create 6 rows of labels each to display guesses and their colors based on MAX_WORD_LENGTH
        self.guess_labels = [[tk.Label(self.guess_frame, width=5, height=2) for _ in range(MAX_WORD_LENGTH)] for _ in range(6)]
        for i, row in enumerate(self.guess_labels):
            for j, label in enumerate(row):
                label.grid(row=i, column=j, padx=5, pady=5)

    def make_guess(self):
        guess = self.entry.get().lower()

        if guess not in WORDS:
            messagebox.showwarning("Warning", "The guessed word is not in the database!")
            return

        self.attempts += 1
        current_feedback = feedback(self.target_word, guess)

        # Update the labels with guessed letters and their respective colors
        for i, color in enumerate(current_feedback):
            self.guess_labels[self.attempts - 1][i].config(text=guess[i] if i < len(guess) else "", bg=color)

        if guess == self.target_word:
            messagebox.showinfo("Congratulations", "You've guessed the word!")
            self.restart_game()
        elif self.attempts == self.max_attempts:
            messagebox.showinfo("Game Over", f"Sorry, the correct word was {self.target_word}.")
            self.restart_game()
        else:
            self.label.config(text=f"Attempt {self.attempts + 1}/{self.max_attempts}")

    def restart_game(self):
        self.target_word = random.choice(WORDS)
        self.attempts = 0
        self.label.config(text=f"Attempt {self.attempts + 1}/{self.max_attempts}")
        self.entry.delete(0, tk.END)
        
        # Reset the colored labels
        for row in self.guess_labels:
            for label in row:
                label.config(text="", bg="white")

if __name__ == "__main__":
    app = WordleGame()
    app.mainloop()

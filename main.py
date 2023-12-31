import tkinter as tk
from tkinter import messagebox
import random
import pandas as pd

# Read 'Element' column from the csv file
elements_df = pd.read_csv('data/elements_simple.csv')
WORDS = elements_df['Element'].str.lower().tolist()

# Extract Period, Group, and Element symbol information
PERIODIC_TABLE = elements_df.set_index('Element')[['Symbol', 'Period', 'Group', 'AtomicNumber']].to_dict(orient='index')


# Determine the maximum word length for GUI adjustments
MAX_WORD_LENGTH = max(map(len, WORDS))

def feedback(target, guess):
    """Provide feedback on the guessed word."""
    result = []
    used_indices = []  # Track indices in the target word that have already been matched
    
    # Use the length of the longest word for the loop to avoid out-of-range errors
    for i in range(max(len(target), len(guess))):
        # If the current position is out of range for the target but not for the guess, mark it as 'black'
        if i >= len(target):
            result.append('black')
            continue
        
        if i >= len(guess):
            result.append('white')
            continue
        
        if guess[i] == target[i]:
            result.append('green')
            used_indices.append(i)
        else:
            result.append('gray')  # Default to gray, might be updated to yellow later

    # Check for yellow feedback, ensuring not to double-count letters
    for i, char in enumerate(guess):
        if char in target and result[i] == 'gray':
            for idx, t_char in enumerate(target):
                if char == t_char and idx not in used_indices:
                    result[i] = 'orange'
                    used_indices.append(idx)
                    break  # Exit once we've found a match that hasn't been used
                    
    return result

class WordleGame(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Wordle Game")
        self.geometry(f"{50 * MAX_WORD_LENGTH}x450")

        self.target_word = random.choice(WORDS)
        self.debug_label = tk.Label(self, text=f"Debug: {self.target_word}")
        self.debug_label.pack(pady=20)

        self.attempts = 0
        self.max_attempts = 6

        # Add the periodic table grid above the attempts label
        self.pse_frame = tk.Frame(self)
        self.pse_frame.pack(pady=20)
        
        self.element_labels = {}
        # In the WordleGame's __init__ method, modify the loop for the periodic table grid like this:


        # Calculate the offset to center lanthanides and actinides
        offset = (18 - 15) // 2

        for element, data in PERIODIC_TABLE.items():
            row, col = data['Period'], data['Group']

            # Check for lanthanides and actinides and adjust their positions
            if 57 <= data['AtomicNumber'] <= 71:  # Lanthanides
                row = 10  # A value that sets them below the main table and adds some space
                col = data['AtomicNumber'] - 56 + offset  # Starts from 1 and adds the offset
            elif 89 <= data['AtomicNumber'] <= 103:  # Actinides
                row = 11  # Below lanthanides
                col = data['AtomicNumber'] - 88 + offset  # Starts from 1 and adds the offset

            lbl = tk.Label(self.pse_frame, text="", width=3, height=1, borderwidth=1, relief="solid")
            lbl.grid(row=row, column=col, padx=1, pady=1)

            self.element_labels[element.lower()] = lbl

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

        # Additional attributes to hold arrow labels
        self.arrow_labels = []



    def make_guess(self):
        guess = self.entry.get().lower()

        if guess not in WORDS:
            messagebox.showwarning("Warning", "The guessed word is not in the database!")
            return

        # Highlight the guessed element in the periodic table
        if guess in self.element_labels:
            self.element_labels[guess].config(bg="blue")

        # Get the positions of the guessed and target elements
        guessed_row, guessed_col = PERIODIC_TABLE[guess.capitalize()]['Period'], PERIODIC_TABLE[guess.capitalize()]['Group']
        target_row, target_col = PERIODIC_TABLE[self.target_word.capitalize()]['Period'], PERIODIC_TABLE[self.target_word.capitalize()]['Group']

        # Determine arrow direction
        vertical_direction = "↓" if guessed_row < target_row else "↑" if guessed_row > target_row else ""
        horizontal_direction = "→" if guessed_col < target_col else "←" if guessed_col > target_col else ""
        arrow_text = vertical_direction + horizontal_direction

        # Display arrow direction next to the guess
        arrow_label = tk.Label(self.guess_frame, text=arrow_text, font=("Arial", 18))
        arrow_label.grid(row=self.attempts, column=MAX_WORD_LENGTH + 1, padx=5, pady=5)  # Use current attempt value

        current_feedback = feedback(self.target_word, guess)

        # Update the labels with guessed letters and colors
        for i, color in enumerate(current_feedback):
            self.guess_labels[self.attempts][i].config(text=guess[i] if i < len(guess) else "", bg=color)

        self.attempts += 1

        if guess == self.target_word:
            messagebox.showinfo("Congratulations", "You've guessed the word!")
            self.restart_game()
        elif self.attempts == self.max_attempts:
            messagebox.showinfo("Game Over", f"Sorry, the correct word was {self.target_word}.")
            self.restart_game()
        else:
            self.label.config(text=f"Attempt {self.attempts + 1}/{self.max_attempts}")


    def restart_game(self):
        self.target_word = random.choice(WORDS)  # Update the target word first
        self.debug_label.config(text=f"Debug: {self.target_word}")  # DEBUG

        self.attempts = 0
        self.label.config(text=f"Attempt {self.attempts + 1}/{self.max_attempts}")
        self.entry.delete(0, tk.END)
        
        # Reset the periodic table color highlights
        for element in self.element_labels:
            self.element_labels[element].config(bg="white")

        # Reset the colored labels for the guesses
        for row in self.guess_labels:
            for label in row:
                label.config(text="", bg="white")


if __name__ == "__main__":
    app = WordleGame()
    app.mainloop()

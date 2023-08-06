import os

PRE_PROMPT = """
These files represent a collection of documents from my project directory. They encompass various aspects of the
project, including design, implementation, and documentation. I am providing these files as context to ensure that
the AI understands the broader scope and intricacies of the project. When answering questions or providing suggestions
based on this prompt, the AI should reference and consider the content of these files to provide accurate and relevant
information. The goal is to have a more informed and context-aware interaction.
"""


def fetch_files_content(directory, exclude_files):
    """
    Fetch the content of all files in the given directory excluding the ones in exclude_files list.
    """
    contents = {}

    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath) and filename not in exclude_files:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as file:
                contents[filename] = file.read()

    return contents


def create_ai_prompt(contents):
    """
    Create a prompt for an AI model listing the contents of the files.
    """
    prompt = PRE_PROMPT + "\nContext from files:\n\n"

    for filename, content in contents.items():
        prompt += f"--- {filename} ---\n"
        prompt += content + "\n\n"

    return prompt


def main():
    # Directory above the current script
    parent_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Files to exclude
    exclude_files = [
        "config.txt",
        "output.txt",
        "MANUAL.md",
        "package-lock.json",
        "util.js",
        ".env",
        ".env.example",
        ".gitignore",
        ".npmignore",
    ]  # Add more filenames to this list as needed

    # Fetch contents
    contents = fetch_files_content(parent_directory, exclude_files)

    # Create AI prompt
    prompt = create_ai_prompt(contents)

    # Output to a .txt file
    with open("preprompt_output.txt", "w", encoding="utf-8") as output_file:
        output_file.write(prompt)

    # Display processed files
    print("Processed files:")
    for filename in contents.keys():
        print(f"- {filename}")

    # Display ignored files
    print("\nIgnored files:")
    for filename in exclude_files:
        print(f"- {filename}")

    # Display total characters and words
    total_characters = sum(len(content) for content in contents.values())
    total_words = sum(len(content.split()) for content in contents.values())
    print(f"\nTotal characters: {total_characters}")
    print(f"Total words: {total_words}")

    # Display total tokens (assuming a token is a word or punctuation mark separated by spaces)
    total_tokens = total_words * 1.33
    print(f"Total tokens: {total_tokens:.0f}")

    # Calculate the cost of the prompt
    cost_per_1ktoken = 0.06
    cost = total_tokens / 1000 * cost_per_1ktoken
    print(f"Cost for gpt4-32k: ${cost:.2f}")


if __name__ == "__main__":
    main()

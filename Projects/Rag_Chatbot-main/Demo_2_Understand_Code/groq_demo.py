import os
import sys
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

def main():
    print("--- Groq API Educational Demo: LLM Interaction ---")
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found in .env file.")
        return

    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # 1. Initialize ChatGroq
    print(f"\n[1] Initializing Groq Client (Model: {model_name})...")
    llm = ChatGroq(
        api_key=api_key,
        model=model_name,
        temperature=0.7
    )

    # 2. Interactive Loop
    print("\n[2] Start Chatting (type 'quit' to exit)")
    
    # We can use a simple prompt template
    system_prompt = "You are a helpful assistant explaining concepts clearly."
    
    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in ['quit', 'exit']:
            break
            
        if not user_input:
            continue

        print("Groq: Generating response...", end="\r")
        
        try:
            # invocating the model
            messages = [
                ("system", system_prompt),
                ("human", user_input),
            ]
            response = llm.invoke(messages)
            
            # Clear the loading line
            print(" " * 30, end="\r")
            print(f"Groq: {response.content}")
            
        except Exception as e:
            print(f"\nError interacting with Groq: {e}")

if __name__ == "__main__":
    main()

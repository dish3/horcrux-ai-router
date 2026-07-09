"""
Lightweight rule-based sentiment classification utility.
"""

from typing import Dict, Any

def handle_sentiment(prompt: str) -> str:
    """
    Classifies the sentiment of the input prompt using a simple word lexicon.

    Args:
        prompt: The input task prompt.

    Returns:
        A string containing the sentiment label and a one-line keyword justification.
    """
    positive_words = {
        "great", "love", "excellent", "fantastic", "amazing", "wonderful", 
        "good", "beautiful", "happy", "awesome", "perfect", "enjoy", "pleasant", "delight"
    }
    negative_words = {
        "bad", "terrible", "hate", "awful", "horrible", "poor", "worse", 
        "worst", "dislike", "angry", "sad", "failure", "bug", "broken", "annoy"
    }
    
    # Tokenize and normalize words
    words = [w.strip(".,!?\"'()").lower() for w in prompt.split()]
    
    # Identify keyword hits
    matched_pos = [w for w in words if w in positive_words]
    matched_neg = [w for w in words if w in negative_words]
    
    pos_count = len(matched_pos)
    neg_count = len(matched_neg)
    
    if pos_count > neg_count:
        sentiment = "Positive"
        justification = f"Triggered by positive keywords: {list(set(matched_pos))}"
    elif neg_count > pos_count:
        sentiment = "Negative"
        justification = f"Triggered by negative keywords: {list(set(matched_neg))}"
    else:
        sentiment = "Neutral"
        justification = "No dominant positive or negative keywords matched."
        
    return f"Sentiment: {sentiment}. Justification: {justification}"

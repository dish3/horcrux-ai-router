"""
Rule-based extractive summarization handler.
"""

import re
from typing import List, Set
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

class SummarizationHandler(LocalHandler):
    """
    Summarizes task prompts using keyword frequency scoring with a fallback heuristic.
    """

    def can_handle(self, task: Task, category: str) -> bool:
        """
        SummarizationHandler handles tasks classified as 'summarization'.
        """
        return category == "summarization"

    def execute(self, task: Task) -> LocalResult:
        """
        Extracts summary sentences. Returns ONLY the summary text inside a LocalResult.
        """
        prompt = task.prompt
        
        # 1. Isolate text body after colon if present (ignores instruction headers)
        text_body = prompt
        if ":" in prompt:
            parts = prompt.split(":", 1)
            if len(parts[1].strip()) > 30:
                text_body = parts[1].strip()

        # 2. Split text into sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text_body) if s.strip()]
        if not sentences:
            logger.warning("No sentences found in text. Returning prompt as summary.")
            return LocalResult(answer=prompt, confidence=1.0)

        # 3. Stopwords list
        stopwords: Set[str] = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", 
            "is", "was", "were", "it", "this", "that", "of", "by", "as", "are", "from",
            "has", "had", "have", "be", "been", "which", "who", "whom", "whose", "about",
            "if", "then", "else", "not", "so", "up", "down", "out", "into", "over", "under"
        }

        # 4. Tokenize and calculate word frequencies (case-insensitive)
        word_freq = {}
        tokens = re.findall(r'\b[a-zA-Z]+\b', text_body.lower())
        for token in tokens:
            if token not in stopwords:
                word_freq[token] = word_freq.get(token, 0) + 1

        # Check if we have sufficient content word tokens for scoring
        has_sufficient_info = len(word_freq) > 3

        if has_sufficient_info:
            logger.info("Executing keyword-frequency summarization...")
            # Score sentences based on sum of normalized word frequencies
            sentence_scores = []
            for idx, sentence in enumerate(sentences):
                score = 0
                s_words = re.findall(r'\b[a-zA-Z]+\b', sentence.lower())
                for w in s_words:
                    score += word_freq.get(w, 0)
                # Normalize to avoid favoring very long sentences purely for length
                word_count = len(s_words)
                normalized_score = score / max(word_count, 1)
                sentence_scores.append((normalized_score, idx, sentence))

            # Sort descending by score
            sentence_scores.sort(key=lambda x: x[0], reverse=True)
            
            # Select number of sentences based on length constraints in prompt
            prompt_lower = prompt.lower()
            num_sentences = 1
            if "one sentence" in prompt_lower or "1 sentence" in prompt_lower:
                num_sentences = 1
            elif "two sentences" in prompt_lower or "2 sentences" in prompt_lower:
                num_sentences = 2
            elif "three sentences" in prompt_lower or "3 sentences" in prompt_lower:
                num_sentences = 3

            num_sentences = min(num_sentences, len(sentences))

            # Sort by original sentence occurrence to preserve text logic flow
            top_selections = sentence_scores[:num_sentences]
            top_selections.sort(key=lambda x: x[1])
            summary = " ".join([item[2] for item in top_selections])
        else:
            logger.info("Insufficient content words. Applying first important sentence heuristic...")
            # Fallback: find the first sentence that is not empty and has a reasonable length
            fallback_sentence = sentences[0]
            for s in sentences:
                s_words = re.findall(r'\b[a-zA-Z]+\b', s)
                # An important sentence usually has more than 5 words
                if len(s_words) > 5:
                    fallback_sentence = s
                    break
            summary = fallback_sentence

        confidence = 0.97
        logger.info(f"Summarization complete. Summary length: {len(summary)} characters (Confidence: {confidence:.2f}).")
        return LocalResult(answer=summary, confidence=confidence)

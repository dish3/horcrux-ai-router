"""
Named Entity Recognition (NER) handler utilizing spaCy or regular expressions.
"""

import re
from typing import Dict, List, Set
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalHandler, LocalResult
from backend.app.utils.logger import logger

# Try loading spaCy library dynamically
try:
    import spacy
    _HAS_SPACY = True
except ImportError:
    _HAS_SPACY = False

# Load standard English model if library is available
nlp = None
if _HAS_SPACY:
    try:
        nlp = spacy.load("en_core_web_sm")
        logger.info("Successfully loaded spaCy model 'en_core_web_sm' for local NER.")
    except Exception as e:
        logger.warning(f"spaCy is installed but failed to load 'en_core_web_sm' model ({e}). Falling back to Regex NER.")
        nlp = None

class NERHandler(LocalHandler):
    """
    Extracts PERSON, ORGANIZATION, LOCATION, and DATE entities from task prompts.
    """

    def can_handle(self, task: Task, category: str) -> bool:
        """
        NERHandler handles tasks classified as 'ner'.
        """
        return category == "ner"

    def execute(self, task: Task) -> LocalResult:
        """
        Extracts entities and returns them in a LocalResult structure.
        """
        prompt = task.prompt
        
        # 1. Isolate text body after colon if present (ignores instruction headers)
        text_to_analyze = prompt
        if ":" in prompt:
            parts = prompt.split(":", 1)
            if len(parts[1].strip()) > 5:
                text_to_analyze = parts[1].strip()

        if nlp is not None:
            answer = self._execute_spacy(text_to_analyze)
            handler_name = "NERHandler_spaCy"
            has_entities = "Person: None, Organization: None, Location: None, Date: None" not in answer
            confidence = 0.95 if has_entities else 0.60
        else:
            answer = self._execute_regex_fallback(text_to_analyze)
            handler_name = "NERHandler_Regex"
            has_entities = "Person: None, Organization: None, Location: None, Date: None" not in answer
            confidence = 0.90 if has_entities else 0.55
            
        return LocalResult(answer=answer, confidence=confidence, handler_name=handler_name)

    def _execute_spacy(self, text: str) -> str:
        """
        Extracts entities using loaded spaCy pipelines.
        """
        logger.info("Executing NER via spaCy...")
        doc = nlp(text)
        
        persons: Set[str] = set()
        orgs: Set[str] = set()
        locations: Set[str] = set()
        dates: Set[str] = set()

        for ent in doc.ents:
            # Map spaCy entity tags to standard evaluation tags
            if ent.label_ == "PERSON":
                persons.add(ent.text)
            elif ent.label_ == "ORG":
                orgs.add(ent.text)
            elif ent.label_ in ("GPE", "LOC"):
                locations.add(ent.text)
            elif ent.label_ == "DATE":
                dates.add(ent.text)

        person_str = ", ".join(sorted(list(persons))) if persons else "None"
        org_str = ", ".join(sorted(list(orgs))) if orgs else "None"
        loc_str = ", ".join(sorted(list(locations))) if locations else "None"
        date_str = ", ".join(sorted(list(dates))) if dates else "None"

        return f"Person: {person_str}, Organization: {org_str}, Location: {loc_str}, Date: {date_str}"

    def _execute_regex_fallback(self, text: str) -> str:
        """
        Regex-based entity extraction fallback.
        """
        logger.info("Executing NER via Regex fallback...")
        
        # Match capitalized word sequences
        adjacent_matches = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        known_locations = {
            "london", "paris", "tokyo", "beijing", "berlin", "washington", "new york",
            "france", "japan", "china", "germany", "usa", "uk", "england", "america"
        }
        known_orgs = {
            "google", "microsoft", "apple", "amd", "nvidia", "intel", "openai", "fireworks",
            "horcrux", "facebook", "meta", "amazon", "netflix"
        }
        instruction_verbs = {
            "extract", "identify", "list", "find", "show", "give", "analyze", "run",
            "summarize", "summarise", "classify", "detect", "get", "locate", "search",
            "who", "what", "where", "when", "why", "how", "from", "the", "this"
        }

        persons: Set[str] = set()
        orgs: Set[str] = set()
        locations: Set[str] = set()

        for entity in adjacent_matches:
            entity_lower = entity.lower()
            if entity_lower in instruction_verbs:
                continue
            if entity_lower in known_locations:
                locations.add(entity)
            elif entity_lower in known_orgs:
                orgs.add(entity)
            else:
                months_days = {
                    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
                    "january", "february", "march", "april", "may", "june", "july", "august", 
                    "september", "october", "november", "december"
                }
                if entity_lower not in months_days:
                    persons.add(entity)

        # Match years and month names
        months_pattern = r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b'
        years_pattern = r'\b\d{4}\b'
        relative_dates_pattern = r'\blast\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|year|month)\b'
        
        dates: Set[str] = set()
        dates.update(re.findall(years_pattern, text))
        dates.update(re.findall(months_pattern, text, re.IGNORECASE))
        dates.update(re.findall(relative_dates_pattern, text, re.IGNORECASE))

        person_str = ", ".join(sorted(list(persons))) if persons else "None"
        org_str = ", ".join(sorted(list(orgs))) if orgs else "None"
        loc_str = ", ".join(sorted(list(locations))) if locations else "None"
        date_str = ", ".join(sorted(list(dates))) if dates else "None"

        return f"Person: {person_str}, Organization: {org_str}, Location: {loc_str}, Date: {date_str}"

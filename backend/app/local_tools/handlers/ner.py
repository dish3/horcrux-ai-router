"""
Lightweight rule-based named entity recognition (NER) utility using regex.
"""

import re

def handle_ner(prompt: str) -> str:
    """
    Extracts person, organization, location, and date entity candidates.

    Args:
        prompt: The input task prompt.

    Returns:
        A structured string containing extracted entity lists.
    """
    # 1. Isolate target text content (exclude instruction header if colon is present)
    text_to_analyze = prompt
    if ":" in prompt:
        parts = prompt.split(":", 1)
        if len(parts[1].strip()) > 5:
            text_to_analyze = parts[1].strip()

    # 2. Regex to match adjacent capitalized words sequences (potential names/entities)
    adjacent_matches = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text_to_analyze)
    
    # Common location and organization lexicons to filter candidates
    locations = {
        "london", "paris", "tokyo", "beijing", "berlin", "washington", "new york",
        "france", "japan", "china", "germany", "usa", "uk", "england", "america"
    }
    orgs = {
        "google", "microsoft", "apple", "amd", "nvidia", "intel", "openai", "fireworks",
        "horcrux", "facebook", "meta", "amazon", "netflix"
    }
    # Ignore start-of-sentence command words / headers in entity detection
    instruction_verbs = {
        "extract", "identify", "list", "find", "show", "give", "analyze", "run",
        "summarize", "summarise", "classify", "detect", "get", "locate", "search",
        "who", "what", "where", "when", "why", "how", "from", "the", "this"
    }
    
    extracted_persons = []
    extracted_orgs = []
    extracted_locations = []
    
    # Filter candidate sequences
    for entity in adjacent_matches:
        entity_lower = entity.lower()
        if entity_lower in instruction_verbs:
            continue
        if entity_lower in locations:
            extracted_locations.append(entity)
        elif entity_lower in orgs:
            extracted_orgs.append(entity)
        else:
            # Exclude month and day names from person candidates
            months_days = {
                "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
                "january", "february", "march", "april", "may", "june", "july", "august", 
                "september", "october", "november", "december"
            }
            if entity_lower not in months_days:
                extracted_persons.append(entity)

    # 2. Extract Dates: Month names, year numbers (e.g. 2012, 1999), or expressions like "last March"
    months_pattern = r'\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b'
    years_pattern = r'\b\d{4}\b'
    relative_dates_pattern = r'\blast\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|year|month)\b'
    
    dates = []
    # Find years
    dates.extend(re.findall(years_pattern, prompt))
    # Find months (case-insensitive)
    dates.extend(re.findall(months_pattern, prompt, re.IGNORECASE))
    # Find relative dates (case-insensitive)
    dates.extend(re.findall(relative_dates_pattern, prompt, re.IGNORECASE))

    # Format output lists (deduplicated)
    person_str = ", ".join(sorted(list(set(extracted_persons)))) if extracted_persons else "None"
    org_str = ", ".join(sorted(list(set(extracted_orgs)))) if extracted_orgs else "None"
    loc_str = ", ".join(sorted(list(set(extracted_locations)))) if extracted_locations else "None"
    date_str = ", ".join(sorted(list(set(dates)))) if dates else "None"

    return f"Person: {person_str}, Organization: {org_str}, Location: {loc_str}, Date: {date_str}"

"""
Logging utility module for the Horcrux backend application.
"""

import logging
import sys

def setup_logger(name: str = "horcrux") -> logging.Logger:
    """
    Configures and returns a standard stream logger instance.

    Args:
        name: Name of the logger instance.

    Returns:
        A configured logging.Logger instance.
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if setup is called multiple times
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Create console handler and set level to info
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

# Pre-configured default logger for easy import
logger: logging.Logger = setup_logger()

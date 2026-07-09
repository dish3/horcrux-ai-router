"""
Registry for routing strategies, facilitating extensibility and runtime swapping.
"""

from typing import Dict
from backend.app.router.base import BaseRoutingStrategy

_STRATEGY_REGISTRY: Dict[str, BaseRoutingStrategy] = {}

def register_strategy(name: str, strategy: BaseRoutingStrategy) -> None:
    """
    Registers a routing strategy instance under a unique name.

    Args:
        name: Name identifier for the strategy.
        strategy: An instance implementing BaseRoutingStrategy.
    """
    _STRATEGY_REGISTRY[name] = strategy

def get_strategy(name: str) -> BaseRoutingStrategy:
    """
    Retrieves the registered routing strategy by name.

    Args:
        name: The name identifier of the strategy.

    Returns:
        The registered BaseRoutingStrategy instance.

    Raises:
        ValueError: If no strategy with that name is registered.
    """
    if name not in _STRATEGY_REGISTRY:
        raise ValueError(
            f"Routing strategy '{name}' is not registered. "
            f"Available strategies: {list(_STRATEGY_REGISTRY.keys())}"
        )
    return _STRATEGY_REGISTRY[name]

# Import and register default strategies to avoid circular imports
from backend.app.router.strategy_router import CategoryMappingStrategy

register_strategy("category_mapping", CategoryMappingStrategy())

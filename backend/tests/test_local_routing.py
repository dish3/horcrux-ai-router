import pytest
from backend.app.models.task import Task
from backend.app.local_tools.interfaces import LocalResult
from backend.app.local_tools.dispatcher import LocalDispatcher
from backend.app.local_tools.handlers.math import MathHandler
from backend.app.local_tools.handlers.factual import FactualHandler

def test_math_handler_basic():
    handler = MathHandler()
    
    # Simple addition
    t1 = Task(task_id="t1", prompt="Calculate 5 + 3")
    res1 = handler.execute(t1)
    assert res1.handled is True
    assert res1.answer == "8"

    # Parentheses
    t2 = Task(task_id="t2", prompt="What is (10 - 2) * 3?")
    res2 = handler.execute(t2)
    assert res2.handled is True
    assert res2.answer == "24"

def test_math_handler_percentages():
    handler = MathHandler()
    
    # Percentage left (sell 25% of 120)
    t1 = Task(task_id="t1", prompt="A shop has 120 apples. If they sell 25%, how many are left?")
    res1 = handler.execute(t1)
    assert res1.handled is True
    assert res1.answer == "90"

    # Percentage of
    t2 = Task(task_id="t2", prompt="What is 15% of 200?")
    res2 = handler.execute(t2)
    assert res2.handled is True
    assert res2.answer == "30"

def test_math_handler_averages_and_ratios():
    handler = MathHandler()
    
    # Averages
    t1 = Task(task_id="t1", prompt="What is the average of 10, 20, 30?")
    res1 = handler.execute(t1)
    assert res1.handled is True
    assert res1.answer == "20"

    # Ratios
    t2 = Task(task_id="t2", prompt="what is the ratio of 15 to 25?")
    res2 = handler.execute(t2)
    assert res2.handled is True
    assert res2.answer == "3:5"

def test_factual_handler():
    handler = FactualHandler()
    
    # Speed of light
    t1 = Task(task_id="t1", prompt="What is the speed of light in vacuum?")
    res1 = handler.execute(t1)
    assert res1.handled is True
    assert "299,792,458" in res1.answer

    # Unknown fact
    t2 = Task(task_id="t2", prompt="Who was the 4th president of USA?")
    res2 = handler.execute(t2)
    assert res2.handled is False

def test_dispatcher_routing():
    dispatcher = LocalDispatcher()
    math_h = MathHandler()
    fact_h = FactualHandler()
    
    dispatcher.register(math_h)
    dispatcher.register(fact_h)
    
    t_math = Task(task_id="t_math", prompt="5 + 5")
    res_math = dispatcher.execute(t_math, category="math_reasoning")
    assert res_math.handled is True
    assert res_math.answer == "10"
    
    t_fact = Task(task_id="t_fact", prompt="radius of earth")
    res_fact = dispatcher.execute(t_fact, category="factual_knowledge")
    assert res_fact.handled is True
    assert "6,371 km" in res_fact.answer
    
    t_unmatched = Task(task_id="t_unmatched", prompt="explain gravity")
    res_unmatched = dispatcher.execute(t_unmatched, category="logic")
    assert res_unmatched.handled is False

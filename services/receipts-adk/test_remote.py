import vertexai
from vertexai import agent_engines

vertexai.init(project="receipts-agent-2026", location="us-central1")

agent = agent_engines.get('projects/920248197749/locations/us-central1/reasoningEngines/3908520294918127616')

for chunk in agent.stream_query(
    user_id="test",
    message="Amazon order #112-3456789, $89.99 wireless headphones, tracking says delivered May 15 but never received. Draft dispute email."
):
    print(chunk)

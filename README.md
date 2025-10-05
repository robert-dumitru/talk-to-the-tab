# Talk to the Tab

Talk to the tab (T4 for short) is a small, mobile-friendly webapp that lets you split receipts by talking to them. In its current form, this is a minimal prototype to test the assumption that this will be more ergonomic than:
 - (a) using a traditional expense splitting app 
 - (b) using an LLM for the entire splitting process


**Why does this exist? Can't LLMs already do this?**
You can split receipts with LLMs, but often the math doesn't work out correctly. This app uses the gemini live api to understand voice commands, and make tool calls on the underlying receipt. This way, all splitting logic is done by traditional code, making it more likely to be accurate.
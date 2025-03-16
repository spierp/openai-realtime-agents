- Discussion with Trimble 2023/08/24
	- Prompt
		- I work at a commercial construction company and am having a meeting with Trimble, a software company, about how we are starting to use our AI.  Trimble makes our accounting software, called Vista.  The focus of the meeting is to share our current approach and workflow, to get their thoughts and feedback, to help steer our development process.  Our company is sitting on a massive amount of unstructured data.  I have written some tools using to make this unstructured data useful to us.  Help me structure how to present during this meeting, what is an organized flow, and what questions to ask. 
		- Implementation
			- We have set up two models on Azure OpenAI, a text embedding model and a chat model. 
			- Then we setup a storage account on azure.
			- Then we setup flask web app on Azure App Service.  
			- We linked the file share to our App Service using samba.  
			- We use python scripts within our flask app to interface with our Azure Open AI models.
		- The first approach is using FAISS vector stores for similarity search within unstructured data.  I have written a script that crawls through a directory of files, includes PDF and docx. files.  From there we split the text into chunks, and create embeddings of the text.  We use this to create a FAISS vector store.  From here we use a python library called langchain to do simple question and answer over the vector store.  We use a temperature of .2, so the model is more deterministic, and doesn't make things up.  If it isn't provided in the reference information, it won't answer.  We also use a prompt template to steer the model responses.  
		- Next, we try to integrate a structured approach.  Jason exported all of the contract documents from Vista.  We took that, and ingested it in same manner as before to create the FAISS vector store.  
		- But this time we also created a script that would crawl through the documents, extract the text, then send it to our chat model to take the unstructured data and return a structured response.  From there, we converted the structured response to an SQL database.  Then we integrate the SQL database chain.  So when we ask a question, it looks at both the structured data (SQL) and unstructured (vector store) in providing the response.  
		- We are curious how we can more closely integrate what we are doing with Vista in a more seamless way.  Right now, it is a manual process of exporting all the unstructured data. Creating vector stores, and an SQL from that.  Is there a way we could create a more integrated approach?  
	- Organization
		- Primary challenge, manage and making sense of a vast amount of unstructured data.
		- Focusing on subcontracting first, if this unstructured data were more easily accessible, we could use it to help write better subcontracts in the future, understand trends with scope of work descriptions, labor rates, qualifications, and exclusions within the subcontracts.  
		- Robert, PHD data science guru.
		- Justin Clifton. LLM

		- [x] few shot prompting langchain ✅ 2024-04-17
		- [x] PyMuPDF ✅ 2024-04-17
		- [x] Regex ✅ 2024-04-17
		- [x] Unit testing ✅ 2024-04-17

Few shot examples.  As many of those examples as you want.  The length of how many tokens you have in your. 

A inside of that.  ‘END OF SECTION’

Few shot prompting. 

PyUPDF

Not even in a python. 

python – my PDF or fits.  Make it look the same. 

First week of November. 

Regular expressions,

End of section regular expression.  Split document by a certain. 

Unit testing.  Test individual units.  Feed it a little section of the document and see what you get back. 

Unit test python module. 

look for patterns of text.  I want to look at this document and find all occurrences of a string that has a number a dot, and one number specifically afterwards.  Every instance that fits that exact pattern.  Regex, python has a whole module dedicated to these.  Filter out a lot of stuff that is not relevant. 

Way more consistent results.  Combination of the new two of them. Regular expression and the AI, come up with default to. 

If something is centered on the page or likely to be centered on the page.  Likely to not be valuable. 

Justin_clifton

Pre processor idea. 

Falcon, falcon model. 

Nothing beats GPT 3.5 and GPT 4. Much faster.
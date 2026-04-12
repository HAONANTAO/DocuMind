const { PineconeStore } = require('@langchain/pinecone')
const { HumanMessage, SystemMessage } = require('@langchain/core/messages')
const { embeddings, llm, getPineconeIndex } = require('./rag')

/**
 * Retrieve the most relevant document chunks from Pinecone
 * based on the user's question. This is the R (Retrieval) in RAG.
 *
 * @param {string} question - The user's question
 * @param {string} documentId - Which document to search in
 * @param {string} userId - Which user is searching
 * @returns {Array} Top 5 most relevant document chunks
 */
const retrieveChunks = async (question, documentId, userId) => {
  const pineconeIndex = getPineconeIndex()

  // Connect to Pinecone using the user's namespace
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: `user_${userId}`,
    // Filter by documentId so we only search within the selected document
    filter: { documentId: documentId.toString() },
  })

  // Convert the question into a vector and find the 5 most similar chunks
  const results = await vectorStore.similaritySearch(question, 5)
  return results
}

/**
 * Full RAG query pipeline:
 * Question → Retrieve relevant chunks → Build prompt → AI generates answer
 *
 * @param {string} question - The user's question
 * @param {string} documentId - The document to query against
 * @param {string} userId - The user making the request
 * @param {Array} chatHistory - Previous messages for multi-turn conversation
 * @param {Function} onToken - Callback fired for each streamed token (for typewriter effect)
 */
const ragQuery = async (
  question,
  documentId,
  userId,
  chatHistory = [],
  onToken,
) => {
  // Step 1: Retrieve relevant chunks from Pinecone
  const relevantChunks = await retrieveChunks(question, documentId, userId)

  // Step 2: Combine retrieved chunks into a single context string
  const context = relevantChunks
    .map((chunk, index) => `[Chunk ${index + 1}]\n${chunk.pageContent}`)
    .join('\n\n')

  // Step 3: Build the prompt
  // SystemMessage defines the AI's role and rules
  // HumanMessage contains the user's question + retrieved context
  const messages = [
    new SystemMessage(`You are a professional document Q&A assistant.
Answer questions ONLY based on the provided document content.
Do NOT use any knowledge outside of the provided content.
If the answer cannot be found in the document, respond with:
"I couldn't find specific information about that in this document. Try asking about specific topics, key people, dates, or sections you're looking for."
Keep your answers concise and accurate.`),
    ...chatHistory, // Include chat history to support multi-turn conversation
    new HumanMessage(`Please answer the following question based on the document content below:

[Document Content]
${context}

[Question]
${question}`),
  ]

  // Step 4: Stream the AI response token by token
  // Each token is passed to onToken() so the frontend can render a typewriter effect
  const stream = await llm.stream(messages)
  let fullResponse = ''

  for await (const chunk of stream) {
    const token = chunk.content
    if (token) {
      fullResponse += token
      if (onToken) onToken(token)
    }
  }

  // Return the full answer and the source chunks for citation display
  return {
    answer: fullResponse,
    sources: relevantChunks.map((chunk) => ({
      content: chunk.pageContent,
      metadata: chunk.metadata,
    })),
  }
}

module.exports = { ragQuery }

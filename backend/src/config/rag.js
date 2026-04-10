const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai')
const { Pinecone } = require('@pinecone-database/pinecone')

/**
 * Initialize the Pinecone client
 * Pinecone is our vector database — it stores and retrieves
 * document chunks as high-dimensional vectors
 */
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

/**
 * Initialize the OpenAI Embedding model
 * Embeddings convert text into a vector (array of numbers)
 * e.g. "penalty clause" → [0.23, -0.45, 0.12, ... ] (1536 numbers)
 * Text with similar meaning produces similar vectors —
 * this is the foundation of semantic search
 * text-embedding-3-small is the most cost-effective OpenAI embedding model
 */
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
})

/**
 * Initialize the Chat model (LLM)
 * This is the AI responsible for generating answers — the G (Generation) in RAG
 *
 * temperature: 0 → deterministic, factual responses (0 = strict, 1 = creative)
 * streaming: true → enables token-by-token streaming for typewriter effect
 * gpt-4o-mini → best cost-to-performance ratio for development
 */
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o-mini',
  temperature: 0,
  streaming: true,
})

/**
 * Get the Pinecone Index instance
 * The index is like a "table" in a regular database —
 * all document vectors are stored in the "documind" index
 * Returned as a function so each call gets a fresh instance
 */
const getPineconeIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX)
}

module.exports = { embeddings, llm, getPineconeIndex }

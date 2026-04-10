const pdfParse = require('pdf-parse')
const { PineconeStore } = require('@langchain/pinecone')
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter')
const { embeddings, getPineconeIndex } = require('./rag')

/**
 * Extract plain text from a PDF file
 * @param {Buffer} fileBuffer - The PDF file as a binary buffer
 * @returns {string} Extracted plain text content
 */
const parsePDF = async (fileBuffer) => {
  const data = await pdfParse(fileBuffer)
  return data.text
}

/**
 * Split a long text into smaller overlapping chunks
 *
 * Why do we split?
 * 1. LLMs have a limited context window — we can't feed an entire document at once
 * 2. Smaller chunks make semantic search more precise
 *
 * chunkSize: 1000 → each chunk is at most 1000 characters
 * chunkOverlap: 200 → adjacent chunks share 200 characters
 *                     this prevents sentences from being cut off at boundaries
 */
const splitText = async (text) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })
  const chunks = await splitter.createDocuments([text])
  return chunks
}

/**
 * Convert document chunks into vectors and store them in Pinecone
 * This is the "indexing" phase of RAG
 *
 * @param {Array} chunks - The split document chunks
 * @param {string} documentId - Used to filter results when querying
 * @param {string} userId - Ensures users can only search their own documents
 */
const storeChunks = async (chunks, documentId, userId) => {
  const pineconeIndex = getPineconeIndex()

  // Attach metadata to each chunk so we can filter by document and user later
  const documents = chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      documentId: documentId.toString(),
      userId: userId.toString(),
      chunkIndex: index,
    },
  }))

  // PineconeStore.fromDocuments automatically:
  // 1. Calls OpenAI to convert each chunk into a vector
  // 2. Stores the vectors + metadata in Pinecone
  await PineconeStore.fromDocuments(documents, embeddings, {
    pineconeIndex,
    namespace: `user_${userId}`,
  })
}

/**
 * Full document processing pipeline:
 * PDF → Extract text → Split into chunks → Vectorize → Store in Pinecone
 *
 * @param {Buffer} fileBuffer - The PDF binary data
 * @param {string} documentId - The document's MongoDB ID
 * @param {string} userId - The uploading user's ID
 * @returns {number} Number of chunks created
 */
const processDocument = async (fileBuffer, documentId, userId) => {
  // Step 1: Extract text from PDF
  const text = await parsePDF(fileBuffer)

  // Step 2: Split text into chunks
  const chunks = await splitText(text)

  // Step 3: Vectorize and store in Pinecone
  await storeChunks(chunks, documentId, userId)

  return chunks.length
}

module.exports = { processDocument }

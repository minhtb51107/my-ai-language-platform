import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Kiểm duyệt cấu hình Hệ thống Trí tuệ & Định tuyến
  OPENAI_API_KEY: Joi.string().required().messages({
    'any.required': '🚨 Thiếu biến môi trường [OPENAI_API_KEY]. Hệ thống AI không thể hoạt động!',
  }),
  LLM_MODEL: Joi.string().default('gpt-4o-mini'),

  // Kiểm duyệt cấu hình Bộ nhớ đệm nâng cao
  COHERE_API_KEY: Joi.string().required().messages({
    'any.required': '🚨 Thiếu biến môi trường [COHERE_API_KEY]. Hệ thống Reranking sẽ bị vô hiệu hóa!',
  }),

  // Kiểm duyệt cấu hình Hàng đợi & Lưu trữ đám mây Upstash
  REDIS_URL: Joi.string().required().messages({
    'any.required': '🚨 Thiếu chuỗi kết nối [REDIS_URL]. Hệ thống BullMQ và Cache sẽ bị sập!',
  }),

  // Kiểm duyệt cấu hình Giám sát LLMOps
  LANGCHAIN_TRACING_V2: Joi.string().valid('true', 'false').default('false'),
  LANGCHAIN_ENDPOINT: Joi.string().uri().optional(),
  LANGCHAIN_API_KEY: Joi.string().optional(),
  LANGCHAIN_PROJECT: Joi.string().optional(),
});
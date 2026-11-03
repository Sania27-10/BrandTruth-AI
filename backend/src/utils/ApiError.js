export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code || null
  }
}
export const badRequest = (msg, code) => new ApiError(400, msg, code)

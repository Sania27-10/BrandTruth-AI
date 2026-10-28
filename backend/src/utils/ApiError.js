export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export const badRequest = (msg) => new ApiError(400, msg)

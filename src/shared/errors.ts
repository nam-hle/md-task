export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_NOT_FOUND = 2;

export class MdTaskError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = EXIT_ERROR,
  ) {
    super(message);
    this.name = 'MdTaskError';
  }
}

export function taskNotFound(id: number | string): MdTaskError {
  return new MdTaskError(`Task ${id} not found`, EXIT_NOT_FOUND);
}

export function fileNotFound(path: string): MdTaskError {
  return new MdTaskError(`No tasks file found at ${path}. Run: md-task init`, EXIT_NOT_FOUND);
}

export function fileAlreadyExists(path: string): MdTaskError {
  return new MdTaskError(`Tasks file already exists: ${path}`);
}

export function validationError(message: string): MdTaskError {
  return new MdTaskError(message);
}

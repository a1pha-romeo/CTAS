import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      req[source] = schema.parse(dataToValidate);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: err.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message
          }))
        });
      }
      next(err);
    }
  };
}

export default validate;

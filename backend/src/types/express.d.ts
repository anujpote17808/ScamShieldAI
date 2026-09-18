// Express namespace augmentation – adds `userId` to every Request
// so AuthRequest is just a named alias, not a separate interface.
// This eliminates TS2339 ("Property X does not exist on AuthRequest")
// because AuthRequest IS Request, not a subtype that might be missing fields.
import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

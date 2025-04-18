import 'express';
import { V8User } from './v8user.js';

declare global {
  namespace Express {
    interface Request {
      user?: V8User;
    }
  }
}

import { handleRequest } from './waitlist.js';

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

/**
 * Environment Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.WS_PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Supabase (service-role — server only, bypasses RLS)
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Judge0 code-execution sandbox.
  // AWS_VM_URL (a remote, pre-provisioned Judge0 VM) takes priority;
  // otherwise falls back to a local Judge0 docker instance.
  // JUDGE0_URL remains a manual override for either case.
  judge0Url: process.env.AWS_VM_URL || process.env.JUDGE0_URL || 'http://localhost:2358',
};

export default config;

// Supabase Edge Function: sync-google-form-resource
// Handles incoming resource submissions from Google Apps Script (onFormSubmit)
// Runs in Supabase Deno Runtime

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint for admin test
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'online',
        function: 'sync-google-form-resource',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, status: 'invalid', code: 'METHOD_NOT_ALLOWED', message: 'Chỉ chấp nhận phương thức POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[SYNC] REQUEST RECEIVED');

  try {
    // 1. Xác thực Secret (Section 10 & 17: GOOGLE_FORM_SYNC_SECRET)
    const expectedSecret = Deno.env.get('GOOGLE_FORM_SYNC_SECRET') || 'SECURE_WEBHOOK_SECRET_KEY_2026';
    const headerSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('secret');

    const providedSecret = headerSecret || bearerSecret || querySecret;

    if (expectedSecret && providedSecret !== expectedSecret) {
      console.error('[SYNC][ERROR] AUTHENTICATION FAILED: Secret không khớp.');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'invalid',
          code: 'UNAUTHORIZED',
          message: 'Bảo mật: Mã Secret xác thực không hợp lệ. Vui lòng kiểm tra GOOGLE_FORM_SYNC_SECRET.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC] AUTHENTICATION PASSED');

    // 2. Parse & Validate Payload (Section 11 & 12)
    let payload: Record<string, any> = {};
    try {
      payload = await req.json();
    } catch {
      console.error('[SYNC][ERROR] INVALID_JSON');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'invalid',
          code: 'INVALID_PAYLOAD',
          message: 'Dữ liệu gửi lên không đúng định dạng JSON.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawEmail = (
      payload.teacher_email ||
      payload.email ||
      payload['Email'] ||
      payload['Địa chỉ email'] ||
      ''
    ).toString().trim();
    const teacherEmail = rawEmail.toLowerCase();

    const title = (
      payload.title ||
      payload['Tên tài nguyên'] ||
      payload['Tiêu đề tài nguyên'] ||
      ''
    ).toString().trim();

    let submissionId = (payload.submission_id || '').toString().trim();
    if (!submissionId) {
      submissionId = `gf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    if (!teacherEmail || !teacherEmail.includes('@')) {
      console.error('[SYNC][ERROR] INVALID_PAYLOAD: Email trống hoặc sai định dạng');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'invalid',
          code: 'INVALID_PAYLOAD',
          message: 'Email giáo viên không hợp lệ hoặc để trống.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      console.error('[SYNC][ERROR] INVALID_PAYLOAD: Tiêu đề tài nguyên trống');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'invalid',
          code: 'INVALID_PAYLOAD',
          message: 'Tên tài nguyên không được để trống.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC] PAYLOAD VALIDATED');

    // 3. Khởi tạo Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SYNC][ERROR] THIẾU CẤU HÌNH BÊN NGOÀI: SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được đặt trong Supabase Secrets.');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          code: 'SERVER_MISCONFIGURED',
          message: 'Lỗi máy chủ: Thiếu biến môi trường Supabase URL hoặc Service Role Key.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[SYNC] TEACHER LOOKUP');
    console.log('[SYNC] SUBJECT LOOKUP');
    console.log('[SYNC] GRADE LOOKUP');
    console.log('[SYNC] RESOURCE TYPE LOOKUP');
    console.log('[SYNC] CREATE RESOURCE');

    // 4. Gọi Stored Procedure sync_google_form_resource
    const { data, error } = await supabase.rpc('sync_google_form_resource', {
      p_payload: {
        ...payload,
        submission_id: submissionId,
        teacher_email: teacherEmail,
        title: title,
      },
      p_secret: providedSecret,
    });

    if (error) {
      console.error('[SYNC][ERROR] Database RPC error:', error.message);
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          code: 'DATABASE_ERROR',
          message: 'Lỗi thực thi Stored Procedure: ' + error.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Kiểm tra kết quả từ database
    if (data?.status === 'duplicate') {
      console.log('[SYNC] DUPLICATE SUBMISSION DETECTED: ' + submissionId);
      return new Response(
        JSON.stringify({
          success: true,
          status: 'duplicate',
          resource_id: data.resource_id,
          submission_id: submissionId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.code === 'TEACHER_NOT_FOUND' || data?.status === 'invalid' && data?.message?.includes('chưa được đăng ký')) {
      console.error('[SYNC][ERROR] TEACHER_NOT_FOUND: ' + teacherEmail);
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          code: 'TEACHER_NOT_FOUND',
          message: 'Email chưa được đăng ký trong hệ thống.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC] TEACHER FOUND');
    console.log('[SYNC] RESOURCE CREATED');
    console.log('[SYNC] CREATE NOTIFICATION');
    console.log('[SYNC] SUCCESS');

    return new Response(
      JSON.stringify({
        success: true,
        status: 'synced',
        resource_id: data?.resource_id,
        submission_id: submissionId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[SYNC][ERROR]', err?.message || err);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'failed',
        code: 'INTERNAL_ERROR',
        message: err?.message || 'Lỗi xử lý Edge Function.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

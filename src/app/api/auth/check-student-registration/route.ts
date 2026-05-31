import { createClient } from "@supabase/supabase-js";

type CheckBody = {
  email: string;
  studentId: string;
};

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

function isValidStudentId(studentId: string) {
  return /^\d{1,8}$/.test(studentId);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return Response.json(
      { error: "Missing Supabase server environment variables." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as CheckBody;

  const email = body.email?.trim().toLowerCase();
  const studentId = body.studentId?.trim();

  if (!email || !isHcdcEmail(email)) {
    return Response.json(
      { error: "Only official HCDC email accounts are allowed." },
      { status: 400 },
    );
  }

  if (!studentId || !isValidStudentId(studentId)) {
    return Response.json(
      { error: "Student ID must contain numbers only, maximum of 8 digits." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: existingEmail, error: emailError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (emailError) {
    return Response.json({ error: emailError.message }, { status: 400 });
  }

  if (existingEmail) {
    return Response.json({
      exists: true,
      field: "email",
      message: "This HCDC email is already registered. Please login instead.",
    });
  }

  const { data: existingStudentId, error: idError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id_number", studentId)
    .maybeSingle();

  if (idError) {
    return Response.json({ error: idError.message }, { status: 400 });
  }

  if (existingStudentId) {
    return Response.json({
      exists: true,
      field: "studentId",
      message:
        "This student ID number is already registered. Please login or contact the admin.",
    });
  }

  return Response.json({
    exists: false,
  });
}

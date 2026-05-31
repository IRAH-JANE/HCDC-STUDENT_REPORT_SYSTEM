import { createClient } from "@supabase/supabase-js";

type CreateUserBody = {
  fullName: string;
  employeeId: string;
  email: string;
  password: string;
  role: "department_staff" | "admin";
  departmentId?: string | null;
};

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return Response.json(
        {
          error:
            "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized request." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user: requestingUser },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !requestingUser) {
      return Response.json({ error: "Invalid user session." }, { status: 401 });
    }

    const { data: requesterProfile, error: requesterProfileError } =
      await adminClient
        .from("profiles")
        .select("role")
        .eq("id", requestingUser.id)
        .single();

    if (requesterProfileError || requesterProfile?.role !== "admin") {
      return Response.json(
        { error: "Only admins can create staff/admin accounts." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateUserBody;

    const fullName = body.fullName?.trim();
    const employeeId = body.employeeId?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;
    const departmentId = body.departmentId || null;

    if (!fullName) {
      return Response.json(
        { error: "Full name is required." },
        { status: 400 },
      );
    }

    if (!employeeId) {
      return Response.json(
        { error: "Employee ID is required." },
        { status: 400 },
      );
    }

    if (!email || !isHcdcEmail(email)) {
      return Response.json(
        { error: "Only @hcdc.edu.ph email accounts are allowed." },
        { status: 400 },
      );
    }

    if (!password || password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    if (role !== "department_staff" && role !== "admin") {
      return Response.json(
        { error: "Invalid role selected." },
        { status: 400 },
      );
    }

    if (role === "department_staff" && !departmentId) {
      return Response.json(
        { error: "Department staff must be assigned to a department." },
        { status: 400 },
      );
    }

    let createdUser;

    try {
      const result = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (result.error || !result.data.user) {
        return Response.json(
          { error: result.error?.message || "Failed to create user." },
          { status: 400 },
        );
      }

      createdUser = result.data.user;
    } catch {
      return Response.json(
        {
          error:
            "Supabase Auth request failed. Check your internet connection, Supabase project status, Supabase URL, and service role key.",
        },
        { status: 500 },
      );
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: createdUser.id,
      full_name: fullName,
      employee_id: employeeId,
      email,
      role,
      department_id: role === "department_staff" ? departmentId : null,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(createdUser.id);

      return Response.json({ error: profileError.message }, { status: 400 });
    }

    return Response.json({
      message: "Account created successfully.",
    });
  } catch {
    return Response.json(
      { error: "Unexpected server error while creating account." },
      { status: 500 },
    );
  }
}

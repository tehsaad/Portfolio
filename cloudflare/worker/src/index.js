export default {
  async fetch(request, env) {
    try {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first();

      return Response.json({
        success: true,
        database: result?.ok === 1
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: "Database connection failed"
        },
        { status: 500 }
      );
    }
  }
};
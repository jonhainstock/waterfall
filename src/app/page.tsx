/**
 * Root Route - Application Entry Point
 *
 * This route serves as the entry point for the Waterfall application.
 *
 * Behavior:
 * - Authenticated users: Redirect to first organization dashboard or /account/organizations
 * - Unauthenticated users: Show login/signup landing page
 *
 * NOTE: This repo is app-only. Marketing site is separate.
 * NO marketing content (hero sections, pricing, etc.) should be added here.
 */

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Waterfall</h1>
          <p className="text-gray-600 mt-2">Revenue Recognition</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Authentication setup in progress
              </p>
              <p className="text-xs text-gray-500">
                Login and signup pages will be implemented next
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center">
                This is the app entry point. Marketing site is separate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

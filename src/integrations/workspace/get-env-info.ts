import { getPythonEnvPath } from "./get-python-env"
import { getJavaScriptEnvironment } from "./get-js-env"

export interface EnvironmentInfo {
	python?: string
	javascript?: {
		nodeVersion?: string
		typescript?: {
			version: string
		}
		packageManagers?: Array<{
			name: string
			version: string
			globalPackages: string[]
		}>
	}
}

/**
 * Fetches environment information about Python and JavaScript/TypeScript environments.
 * NOTE: For performance reasons, you should use getCachedEnvironmentInfo from environment-cache.ts
 * instead of calling this function directly.
 */
export async function getEnvironmentInfo(): Promise<EnvironmentInfo> {
	const [pythonPath, jsEnv] = await Promise.all([
		getPythonEnvPath(),
		getJavaScriptEnvironment(),
	])

	return {
		...(pythonPath && { python: pythonPath }),
		...(Object.keys(jsEnv).length > 0 && { javascript: jsEnv }),
	}
}

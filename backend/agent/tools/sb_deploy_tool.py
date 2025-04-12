import os
from dotenv import load_dotenv
from agentpress.tool import ToolResult, openapi_schema, xml_schema
from sandbox.sandbox import SandboxToolsBase
from utils.files_utils import clean_path

# Load environment variables
load_dotenv()

class SandboxDeployTool(SandboxToolsBase):
    """Tool for deploying static websites from a Daytona sandbox to Cloudflare Pages."""

    def __init__(self, sandbox_id: str, password: str):
        super().__init__(sandbox_id, password)
        self.workspace_path = "/workspace"  # Ensure we're always operating in /workspace
        self.cloudflare_api_token = os.getenv("CLOUDFLARE_API_TOKEN")

    def clean_path(self, path: str) -> str:
        """Clean and normalize a path to be relative to /workspace"""
        return clean_path(path, self.workspace_path)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "deploy",
            "description": "Deploy a static website (HTML+CSS+JS) from a directory in the sandbox to Cloudflare Pages. Only use this tool when permanent deployment to a production environment is needed. The directory path must be relative to /workspace. The website will be deployed to {name}.kortix.cloud.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name for the deployment, will be used in the URL as {name}.kortix.cloud"
                    },
                    "directory_path": {
                        "type": "string",
                        "description": "Path to the directory containing the static website files to deploy, relative to /workspace (e.g., 'build')"
                    }
                },
                "required": ["name", "directory_path"]
            }
        }
    })
    @xml_schema(
        tag_name="deploy",
        mappings=[
            {"param_name": "name", "node_type": "attribute", "path": "."},
            {"param_name": "directory_path", "node_type": "attribute", "path": "."}
        ],
        example='''
        <!-- 
        IMPORTANT: Only use this tool when:
        1. The user explicitly requests permanent deployment to production
        2. You have a complete, ready-to-deploy directory 
                -->

        <deploy name="my-site" directory_path="website">
        </deploy>
        '''
    )
    async def deploy(self, name: str, directory_path: str) -> ToolResult:
        """
        Deploy a static website (HTML+CSS+JS) from the sandbox to Cloudflare Pages.
        Only use this tool when permanent deployment to a production environment is needed.
        
        Args:
            name: Name for the deployment, will be used in the URL as {name}.kortix.cloud
            directory_path: Path to the directory to deploy, relative to /workspace
            
        Returns:
            ToolResult containing:
            - Success: Deployment information including URL
            - Failure: Error message if deployment fails
        """
        try:
            directory_path = self.clean_path(directory_path)
            full_path = f"{self.workspace_path}/{directory_path}"
            
            # Verify the directory exists
            try:
                dir_info = self.sandbox.fs.get_file_info(full_path)
                if not dir_info.is_dir:
                    return self.fail_response(f"'{directory_path}' is not a directory")
            except Exception as e:
                return self.fail_response(f"Directory '{directory_path}' does not exist: {str(e)}")
            
            # Deploy to Cloudflare Pages directly from the container
            try:
                # Get Cloudflare API token from environment
                if not self.cloudflare_api_token:
                    return self.fail_response("CLOUDFLARE_API_TOKEN environment variable not set")
                    
                # Build the deployment command with authentication included
                deploy_cmd = (
                    f"export CLOUDFLARE_API_TOKEN='{self.cloudflare_api_token}' && "
                    # Verify authentication first
                    f"npx wrangler whoami > /dev/null && "
                    # Then deploy
                    f"npx wrangler pages deploy {full_path} "
                    f"--project-name {name} "
                    f"--branch main "
                    f"--commit-dirty=true"
                )
                
                # Execute command directly using process.exec
                response = self.sandbox.process.exec(deploy_cmd, cwd=self.workspace_path)
                
                if response.exit_code == 0:
                    return self.success_response({
                        "message": f"Website deployed successfully",
                        "url": f"https://{name}.kortix.cloud",
                        "details": {
                            "output": response.stdout,
                            "project_name": name,
                            "url": f"https://{name}.kortix.cloud"
                        }
                    })
                else:
                    return self.fail_response(f"Deployment failed: {response.stderr or 'Deployment failed with no error message'}")
            except Exception as e:
                return self.fail_response(f"Error during deployment: {str(e)}")
        
        except Exception as e:
            return self.fail_response(f"Error deploying website: {str(e)}")


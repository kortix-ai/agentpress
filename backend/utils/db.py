from typing import Optional, List, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

async def update_agent_run_status(
    client,
    agent_run_id: str,
    status: str,
    error: Optional[str] = None,
    responses: Optional[List[Any]] = None
) -> bool:
    """
    Centralized function to update agent run status.
    Returns True if update was successful.
    """
    try:
        update_data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        if error:
            update_data["error"] = error
            
        if responses:
            update_data["responses"] = responses
            
        # Retry up to 3 times
        for retry in range(3):
            try:
                update_result = await client.table('agent_runs').update(update_data).eq("id", agent_run_id).execute()
                
                if hasattr(update_result, 'data') and update_result.data:
                    logger.info(f"Successfully updated agent run status to '{status}' (retry {retry}): {agent_run_id}")
                    
                    # Verify the update
                    verify_result = await client.table('agent_runs').select('status', 'completed_at').eq("id", agent_run_id).execute()
                    if verify_result.data:
                        actual_status = verify_result.data[0].get('status')
                        completed_at = verify_result.data[0].get('completed_at')
                        logger.info(f"Verified agent run update: status={actual_status}, completed_at={completed_at}")
                    return True
                else:
                    logger.warning(f"Database update returned no data on retry {retry}: {update_result}")
                    if retry == 2:  # Last retry
                        logger.error(f"Failed to update agent run status after all retries: {agent_run_id}")
                        return False
            except Exception as e:
                logger.error(f"Error updating agent run status on retry {retry}: {str(e)}")
                if retry == 2:  # Last retry
                    raise
                
    except Exception as e:
        logger.error(f"Failed to update agent run status: {str(e)}")
        return False
        
    return False 
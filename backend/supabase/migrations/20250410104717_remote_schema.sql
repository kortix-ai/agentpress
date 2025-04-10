revoke delete on table "public"."agent_runs" from "anon";

revoke insert on table "public"."agent_runs" from "anon";

revoke references on table "public"."agent_runs" from "anon";

revoke select on table "public"."agent_runs" from "anon";

revoke trigger on table "public"."agent_runs" from "anon";

revoke truncate on table "public"."agent_runs" from "anon";

revoke update on table "public"."agent_runs" from "anon";

revoke delete on table "public"."messages" from "anon";

revoke insert on table "public"."messages" from "anon";

revoke references on table "public"."messages" from "anon";

revoke select on table "public"."messages" from "anon";

revoke trigger on table "public"."messages" from "anon";

revoke truncate on table "public"."messages" from "anon";

revoke update on table "public"."messages" from "anon";

revoke delete on table "public"."projects" from "anon";

revoke insert on table "public"."projects" from "anon";

revoke references on table "public"."projects" from "anon";

revoke select on table "public"."projects" from "anon";

revoke trigger on table "public"."projects" from "anon";

revoke truncate on table "public"."projects" from "anon";

revoke update on table "public"."projects" from "anon";

revoke delete on table "public"."threads" from "anon";

revoke insert on table "public"."threads" from "anon";

revoke references on table "public"."threads" from "anon";

revoke select on table "public"."threads" from "anon";

revoke trigger on table "public"."threads" from "anon";

revoke truncate on table "public"."threads" from "anon";

revoke update on table "public"."threads" from "anon";

alter table "public"."projects" add column "sandbox_id" text;

alter table "public"."projects" add column "sandbox_pass" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_llm_formatted_messages(p_thread_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    messages_array JSONB := '[]'::JSONB;
BEGIN
    -- Check if thread exists
    IF NOT EXISTS (
        SELECT 1 FROM threads t
        WHERE t.thread_id = p_thread_id
    ) THEN
        RAISE EXCEPTION 'Thread not found';
    END IF;

    -- Parse content if it's stored as a string and return proper JSON objects
    WITH parsed_messages AS (
        SELECT 
            CASE 
                WHEN jsonb_typeof(content) = 'string' THEN content::text::jsonb
                ELSE content
            END AS parsed_content,
            created_at
        FROM messages
        WHERE thread_id = p_thread_id
        AND is_llm_message = TRUE
    ),
    -- Process each message to ensure tool_calls function arguments are strings
    processed_messages AS (
        SELECT 
            CASE 
                -- When the message has tool_calls
                WHEN jsonb_path_exists(parsed_content, '$.tool_calls') THEN 
                    (
                        WITH tool_calls AS (
                            -- Extract and process each tool call
                            SELECT 
                                jsonb_array_elements(parsed_content -> 'tool_calls') AS tool_call,
                                i AS idx
                            FROM generate_series(0, jsonb_array_length(parsed_content -> 'tool_calls') - 1) AS i
                        ),
                        processed_tool_calls AS (
                            SELECT 
                                idx,
                                CASE 
                                    -- If function arguments exist and is not a string, convert to JSON string
                                    WHEN jsonb_path_exists(tool_call, '$.function.arguments') 
                                         AND jsonb_typeof(tool_call #> '{function,arguments}') != 'string' THEN
                                        jsonb_set(
                                            tool_call, 
                                            '{function,arguments}', 
                                            to_jsonb(tool_call #>> '{function,arguments}')
                                        )
                                    ELSE tool_call
                                END AS processed_tool_call
                            FROM tool_calls
                        ),
                        -- Convert processed tool calls back to an array
                        tool_calls_array AS (
                            SELECT jsonb_agg(processed_tool_call ORDER BY idx) AS tool_calls_array
                            FROM processed_tool_calls
                        )
                        -- Replace tool_calls in the original message
                        SELECT jsonb_set(parsed_content, '{tool_calls}', tool_calls_array)
                        FROM tool_calls_array
                    )
                ELSE parsed_content
            END AS final_content,
            created_at
        FROM parsed_messages
    )
    -- Aggregate messages into an array
    SELECT JSONB_AGG(final_content ORDER BY created_at)
    INTO messages_array
    FROM processed_messages;
    
    -- Handle the case when no messages are found
    IF messages_array IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;
    
    RETURN messages_array;
END;
$function$
;



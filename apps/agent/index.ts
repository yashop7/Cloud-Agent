import { OpenRouter } from "@openrouter/sdk";
import { Result$inboundSchema, type ChatContentItems, type ChatFunctionTool, type ChatMessages, type ChatResult, type ChatToolCall } from "@openrouter/sdk/models"
import { stderr, stdout } from "bun";

const FOLDER_PATH = ""

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});


const messages: ChatMessages[] = [
  { role: "assistant", content: "you are a helpful coding agent, use the bash tool to explore files before answering questions about them" },
  { role: "user", content: `can you tell me more about the project? ${FOLDER_PATH}` }
]



const tools: ChatFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "bash",
      description: "Run a bash command and return its stdout, stdin and exit code.",
      parameters: {  // [k: string]: any;
        type: "object",
        properties: {
          command: {
            type: "string"
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Reads the file at the given path',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string'
          },
        },
        required: ['path'],
      },
    },
  },
];


const subAgentTool: ChatFunctionTool = {
  type: "function",
  function: {
    name: "sub_agent",
    description: 'Delegate a difficult, self-contained task (deep investigation, multi-step analysis, tracing logic across many files) to a sub-agent. The sub-agent has its own fresh context and the same bash/read_file tools, but cannot see this conversation, so describe the task and any relevant context fully. Returns the sub-agent\'s final report.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: "string",
          description: 'A complete, standalone description of what the sub-agent should do and what it should report back.'
        }
      },
      required: ['task']
    }
  }
}




async function runTool(tool: ChatToolCall, tools: ChatFunctionTool[]) {
  // The tool we need to run the tool

  const name = tool.function.name; // we are running the tool

  // check if the tool is presnet or not
  if (!tools.some((tool) => 'function' in tool && tool.function.name == name)) {
    return { exitCode: 1, stdout: '', stderr: `Unknown tool name: ${name}` }
  }

  if (name == "sub-agent") {

  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ stdout: string }>((resolve) => {
    timer = setTimeout(() => {
      console.log("Timeout recived");
      resolve({ stdout: 'Timeout while running the tool' });
    }, 30000)
  })

  const run = async () => {
    if(name == "bash"){
      const {command } = JSON.parse(tool.function) as {}
    }
  }


}

async function getToolResponse(tool: ChatToolCall, tools: ChatFunctionTool[]): Promise<ChatMessages> {
  return {
    role: "tool",
    toolCallId: tool.id,
  }
}

// This function will take all the ChatResults and give us the single response
async function callLLM(messages: ChatMessages[], tools: ChatFunctionTool[]): Promise<ChatResult> {

  const result = await openRouter.chat.send({
    chatRequest: {
      messages,
      model: "openai/gpt-5",
      provider: {
        zdr: true,
        sort: "price",
      },
      stream: false, // we just want the output, don't want streaming
    },
  });


  if (!('choices' in result)) {
    throw new Error('Expected a non-streaming response');
  }

  const choice = result.choices[0];

  if (!choice) {
    throw new Error('Expected the model to return a choice');
  }


  messages.push(choice.message);

  return result; // we get this response from the LLM
}


// Run the Bash Tool
async function runBash(command: string) {
  const result = await Bun.$`bash -c ${command}`.nothrow().quiet(); // running the shell command

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  }
}


async function readFile(path: string) {
  const result = await Bun.$`bash -c ls ${path}`.nothrow().quiet(); // running the shell command

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  }
}


// async function getToolResonse(toolCall : ChatToolCall) : Promise<ChatResult> {

// } 


// this is the main funtion which we gonna use to summon agent , can be the main agent or the sub-agent
async function runAgent(messages: ChatMessages[], tools: ChatFunctionTool[], maxIteration: number, label: 'main' | 'subagent') {
  let iteration = 0;

  while (iteration < maxIteration) {
    iteration++;

    // now we gonna run in the loop and calling the LLM
    const res = await callLLM(messages, tools);
    // the response has already been added to the messages array and now we will use the response of the LLM

    // Total number of token consumed in prompt given and the result
    const contextToken = (res.usage?.promptTokens ?? 0) + (res.usage?.completionTokens ?? 0);
    console.log(`[${label}] Iteration ${iteration}: context ${contextToken} tokens`);

    const choice = res.choices[0];

    if (!choice) {
      throw new Error('Expected the model to return a choice');
    }


    // Now we are looking for any tool calls

    const toolCall = choice.message.toolCalls;

    if (!toolCall || toolCall.length == 0) {
      // if there are no tool call, we gonna return the result

      return choice.message.content;
    }

    // If there are any tool call, we will call the tool

    for (const tool of toolCall) {
      // now we are gonna call any tool, and pass it into function
      messages.push(await getToolResponse(tool, tools));
    }


    // we gonna check that, if don't exceed the Context Window, for that we will summarise the messages

    // if(contextToken > )

    // we will return the final response, which is in in the end of the messages array

    return messages[-1]?.content;
  }
}


// For calling the SubAgent

async function runSubAgent(task: string) {
  const subMessages: ChatMessages[] = [
    {
      role: "system", content: `You are a sub-agent of a coding agent, running inside a sandbox. 
      You have been delegated one specific task. Use the bash and read_file tools to complete it thoroughly. 
      The working directory is ${FOLDER_PATH}. When you are done, reply with a complete, self-contained report 
      of your findings or results - it is the only thing the main agent will see.`},
    { role: "user", content: task }
  ];


  // Run the agent in the B/W
  // This is the agent we are summoning
  const result = runAgent(subMessages,);
}
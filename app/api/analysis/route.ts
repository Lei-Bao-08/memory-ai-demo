import { NextRequest, NextResponse } from 'next/server';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== AI分析API开始 ===');
    
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '请提供要分析的文本内容' }, { status: 400 });
    }

    console.log('分析文本长度:', text.length);

    // 检查Azure OpenAI配置
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    
    if (!endpoint || !apiKey || !deploymentName) {
      return NextResponse.json({ 
        error: 'Azure OpenAI服务未配置，请在.env.local中设置相关环境变量' 
      }, { status: 500 });
    }

    console.log('Azure OpenAI配置检查通过');

    // 创建OpenAI客户端
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

    // 构建分析提示
    let systemPrompt = `你是一个智能文本分析助手。请分析用户提供的文本内容，并提供以下分析结果：

1. 智能标题：生成一个8-12个字的简洁标题，概括文本主要内容
2. 内容摘要：用2-3句话总结文本的核心要点，不超过100字
3. 关键词提取：提取3-6个最重要的关键词
4. 情感分析：判断文本的情感倾向（positive/neutral/negative）
5. 置信度：给出分析的置信度（0-1之间的数值）
6. 任务规划：将文本内容拆分成具体的待办任务，即使是描述性内容也要转化为可执行的行动项

请以JSON格式返回结果，格式如下：
{
  "title": "8-12字的智能标题",
  "summary": "内容摘要",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "sentiment": "positive/neutral/negative", 
  "confidence": 0.85,
  "todos": [
    {
      "id": "todo_1",
      "content": "具体的任务描述",
      "priority": "high/medium/low",
      "completed": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}

任务规划要求：
- 将所有内容转化为可执行的行动项
- 如果是会议记录，提取决策、行动项、跟进事项
- 如果是学习笔记，生成复习、实践、深入了解的任务
- 如果是想法记录，生成验证、实施、完善的任务
- 每个任务要具体、可衡量、有明确的行动动词
- 根据重要性和紧急性设定优先级
- 任务数量控制在2-8个之间

请确保标题字数在8-12字范围内，摘要简洁有力，任务列表实用可执行。`;

    console.log('开始AI分析...');

    const response = await client.getChatCompletions(deploymentName, [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `请分析以下文本内容：\n\n${text}`
      }
    ], {
      temperature: 0.3,
      maxTokens: 1000,
    });

    const result = response.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('AI分析结果为空');
    }

    console.log('AI原始响应:', result);

    // 解析JSON结果
    let analysisResult;
    try {
      // 尝试提取JSON部分
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析JSON结果');
      }
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      // 如果JSON解析失败，尝试手动构建结果
      analysisResult = {
        summary: result.substring(0, 200) + '...',
        keywords: [],
        sentiment: 'neutral',
        confidence: 0.5,
        error: 'JSON解析失败，返回原始文本'
      };
    }

    // 确保所有必需字段都存在
    const finalResult = {
      title: analysisResult.title || '智能分析记录',
      summary: analysisResult.summary || '暂无摘要',
      keywords: analysisResult.keywords || [],
      sentiment: analysisResult.sentiment || 'neutral',
      confidence: analysisResult.confidence || 0.5,
      todos: analysisResult.todos || [],
      rawResponse: result
    };

    const duration = Date.now() - startTime;
    console.log(`AI分析成功，耗时: ${duration}ms`);
    console.log('分析结果:', finalResult);

    return NextResponse.json({
      ...finalResult,
      duration,
      textLength: text.length
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('AI分析错误:', error);
    console.error('错误堆栈:', error?.stack);
    
    return NextResponse.json({ 
      error: error?.message || 'AI分析失败',
      duration,
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      } : undefined
    }, { status: 500 });
  }
} 
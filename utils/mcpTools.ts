/**
 * MCP (Model Context Protocol) Tools Integration
 * Simplified implementation for feedback collection
 */

interface FeedbackItem {
  type: 'text' | 'image';
  content: string;
  timestamp?: string;
}

interface FeedbackCollectorArgs {
  work_summary: string;
  timeout_seconds?: number;
}

/**
 * Collect user feedback using the MCP feedback collector
 * This implementation uses React Native Alert for demonstration
 */
export async function collect_feedback_mcp_feedback_collector(
  args: FeedbackCollectorArgs
): Promise<FeedbackItem[]> {
  try {
    console.log('MCP Feedback Collector called with:', args);

    // Import Alert from React Native
    const { Alert } = await import('react-native');

    return new Promise((resolve) => {
      Alert.alert(
        'AI Assistant Feedback',
        args.work_summary,
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => resolve([])
          },
          {
            text: 'Excellent!',
            onPress: () => resolve([{
              type: 'text',
              content: 'The AI assistant works excellently! XML tool calling is reliable, ReAct mode provides great transparency, and the streaming output is smooth.',
              timestamp: new Date().toISOString()
            }])
          },
          {
            text: 'Good',
            onPress: () => resolve([{
              type: 'text',
              content: 'The AI assistant works well. XML format is more reliable than JSON. Some minor improvements could be made to the user interface.',
              timestamp: new Date().toISOString()
            }])
          },
          {
            text: 'Needs Work',
            onPress: () => resolve([{
              type: 'text',
              content: 'The AI assistant has potential but needs improvements. Tool calling sometimes fails, streaming could be faster, and the interface needs refinement.',
              timestamp: new Date().toISOString()
            }])
          }
        ],
        { cancelable: true, onDismiss: () => resolve([]) }
      );
    });

  } catch (error) {
    console.error('MCP Feedback Collector error:', error);
    throw new Error(`Failed to collect feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Wrapper function to safely call MCP feedback collector with error handling
 */
export async function collectFeedbackSafely(
  workSummary: string,
  timeoutSeconds: number = 30
): Promise<string | null> {
  try {
    const feedbackResult = await collect_feedback_mcp_feedback_collector({
      work_summary: workSummary,
      timeout_seconds: timeoutSeconds
    });

    if (feedbackResult && Array.isArray(feedbackResult)) {
      const textFeedback = feedbackResult
        .filter(item => item.type === 'text')
        .map(item => item.content)
        .join(' ')
        .trim();

      return textFeedback || null;
    }

    return null;
  } catch (error) {
    console.log('Feedback collection failed safely:', error);
    return null;
  }
}

/**
 * Format work summary for feedback collection
 */
export function formatWorkSummaryForFeedback(
  phase: string,
  content: string,
  maxLength: number = 300
): string {
  const truncatedContent = content.length > maxLength
    ? content.substring(0, maxLength) + '...'
    : content;

  return `AI Assistant ${phase.toUpperCase()} Phase Completed:

${truncatedContent}

Please provide feedback on this step:
- Is the analysis clear and logical?
- Are there any concerns or suggestions?
- Should the AI continue or adjust its approach?

Your feedback will help improve the AI's reasoning process.`;
}

/**
 * Check if MCP feedback collector is available
 */
export function isMCPFeedbackAvailable(): boolean {
  // In a real implementation, this would check if the MCP service is running
  // For now, we'll assume it's always available
  return true;
}

/**
 * Get MCP service status
 */
export async function getMCPStatus(): Promise<{
  available: boolean;
  version?: string;
  services: string[];
}> {
  try {
    // Simulate checking MCP status
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      available: true,
      version: '1.0.0',
      services: ['feedback-collector']
    };
  } catch (error) {
    return {
      available: false,
      services: []
    };
  }
}

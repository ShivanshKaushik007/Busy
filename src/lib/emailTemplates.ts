import { OverdueDigestData, OverdueTaskItem } from './emailDigestUtils'

/**
 * Generate a production-grade, responsive HTML email template for the Overdue Work Digest.
 * Features bulletproof inline styles compatible with major desktop, mobile, and webmail clients.
 */
export function generateOverdueEmailHtml(
  data: OverdueDigestData,
  baseUrl: string = 'http://localhost:3000'
): string {
  const { recipient, scope, formattedGeneratedAt, metrics, projectGroups, assigneeSummaries } = data
  const isPortfolio = scope === 'portfolio'

  // Preheader text for mail client snippet previews
  const preheaderText = `${metrics.totalOverdue} overdue ${metrics.totalOverdue === 1 ? 'task requires' : 'tasks require'} your immediate attention in Busy.`

  // Color helpers
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return '#DE350B' // Red
      case 'Medium':
        return '#FF8B00' // Amber
      default:
        return '#0052CC' // Blue
    }
  }

  // Render individual task row
  const renderTaskItem = (task: OverdueTaskItem) => {
    const priorityColor = getPriorityColor(task.priority)
    const taskKey = `${task.projectKey}-${task.id.slice(0, 4).toUpperCase()}`
    const taskLink = `${baseUrl}/board`

    const blockersHtml = task.isBlocked
      ? `
        <div style="margin-top: 6px; display: inline-block; background-color: #FFF0B3; border: 1px solid #FFE380; color: #172B4D; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 3px;">
          ⛔ Blocked ${task.blockingTasks.length > 0 ? `by ${task.blockingTasks.map(b => b.title).join(', ')}` : 'by dependency'}
        </div>
      `
      : ''

    const assigneesHtml = isPortfolio && task.assignees.length > 0
      ? `
        <div style="margin-top: 4px; font-size: 11px; color: #5E6C84;">
          👤 Assigned: <strong>${task.assignees.map(a => a.fullName).join(', ')}</strong>
        </div>
      `
      : ''

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 10px; background-color: #FAFBFC; border: 1px solid #EBECF0; border-left: 4px solid ${priorityColor}; border-radius: 4px;">
        <tr>
          <td style="padding: 12px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top;">
                  <div style="margin-bottom: 4px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #5E6C84; font-family: monospace; background-color: #EBECF0; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.5px;">
                      ${taskKey}
                    </span>
                    <span style="display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: ${priorityColor}; background-color: ${task.priority === 'High' ? '#FFEBE6' : '#EFF2F5'}; padding: 2px 6px; border-radius: 3px;">
                      ${task.priority} Priority
                    </span>
                    <span style="display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: #DE350B; background-color: #FFEBE6; padding: 2px 6px; border-radius: 3px;">
                      ⏱️ ${task.daysOverdue} ${task.daysOverdue === 1 ? 'day' : 'days'} overdue
                    </span>
                  </div>
                  <div style="font-size: 14px; font-weight: 600; color: #172B4D; line-height: 1.4; margin-top: 4px;">
                    ${task.title}
                  </div>
                  <div style="font-size: 12px; color: #6B778C; margin-top: 4px;">
                    Deadline was: <strong style="color: #DE350B;">${task.formattedDueDate}</strong>
                  </div>
                  ${blockersHtml}
                  ${assigneesHtml}
                </td>
                <td align="right" style="vertical-align: middle; width: 90px; padding-left: 10px;">
                  <a href="${taskLink}" target="_blank" style="display: inline-block; background-color: #FFFFFF; border: 1px solid #DFE1E6; color: #0052CC; font-size: 12px; font-weight: 600; text-decoration: none; padding: 6px 12px; border-radius: 3px; white-space: nowrap;">
                    View &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
  }

  // Render project group block
  const projectGroupsHtml = projectGroups.length === 0
    ? `
      <div style="padding: 24px; text-align: center; color: #5E6C84; font-size: 14px; background-color: #FAFBFC; border: 1px dashed #DFE1E6; border-radius: 4px;">
        🎉 Fantastic news! You currently have zero overdue tasks across all projects.
      </div>
    `
    : projectGroups.map(group => `
      <div style="margin-bottom: 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px; border-bottom: 2px solid #EBECF0; padding-bottom: 6px;">
          <tr>
            <td style="font-size: 14px; font-weight: 700; color: #172B4D;">
              📁 ${group.projectName}
              <span style="display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: #0052CC; background-color: #DEEBFF; padding: 2px 6px; border-radius: 3px;">
                ${group.projectKey}
              </span>
            </td>
            <td align="right" style="font-size: 12px; font-weight: 600; color: #DE350B;">
              ${group.overdueCount} overdue
            </td>
          </tr>
        </table>
        ${group.tasks.map(renderTaskItem).join('')}
      </div>
    `).join('')

  // Render portfolio assignee breakdown table if applicable
  const assigneeSummaryHtml = (isPortfolio && assigneeSummaries && assigneeSummaries.length > 0)
    ? `
      <div style="margin-top: 28px; margin-bottom: 24px; border: 1px solid #DFE1E6; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #FAFBFC; padding: 10px 14px; border-bottom: 1px solid #DFE1E6; font-size: 13px; font-weight: 700; color: #172B4D;">
          👥 Portfolio Overdue Work by Team Member
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #F4F5F7; color: #5E6C84; text-align: left; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 14px; font-weight: 600;">Contributor</th>
              <th style="padding: 8px 14px; font-weight: 600;">Email</th>
              <th style="padding: 8px 14px; font-weight: 600; text-align: right;">Overdue Tasks</th>
            </tr>
          </thead>
          <tbody>
            ${assigneeSummaries.map((a, idx) => `
              <tr style="border-top: 1px solid #EBECF0; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC'};">
                <td style="padding: 8px 14px; font-weight: 600; color: #172B4D;">${a.fullName}</td>
                <td style="padding: 8px 14px; color: #5E6C84;">${a.email}</td>
                <td style="padding: 8px 14px; text-align: right; font-weight: 700; color: #DE350B;">
                  ${a.overdueCount}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overdue Work Digest — Busy</title>
  <style type="text/css">
    body, table, td {font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;}
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-outer-td { padding: 10px 6px !important; }
      .email-header-td { padding: 14px 14px !important; }
      .email-body-td { padding: 14px 10px !important; }
      .metric-col { display: table-cell !important; padding: 0 2px !important; }
      .metric-box { padding: 8px 4px !important; }
      .metric-num { font-size: 16px !important; }
      .metric-txt { font-size: 9px !important; }
      .task-card-cell { padding: 10px 10px !important; }
      .task-card-action { width: 60px !important; padding-left: 6px !important; }
      .task-card-btn { padding: 4px 8px !important; font-size: 11px !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #172B4D;">
  
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: #F4F5F7; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheaderText}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F5F7; padding: 24px 12px;" class="email-outer-table">
    <tr>
      <td align="center" class="email-outer-td">
        <!-- Main Email Container (600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 6px; overflow: hidden; border: 1px solid #DFE1E6; box-shadow: 0 1px 3px rgba(9, 30, 66, 0.08);">
          
          <!-- Brand Header -->
          <tr>
            <td class="email-header-td" style="background-color: #0052CC; padding: 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-flex; align-items: center;">
                      <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                        ⚡ BUSY
                      </span>
                      <span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: #0052CC; background-color: #FFFFFF; padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
                        ${isPortfolio ? 'Portfolio Digest' : 'Personal Digest'}
                      </span>
                    </div>
                    <div style="color: #DEEBFF; font-size: 13px; margin-top: 6px;">
                      Daily Overdue Work Summary • <strong>${recipient.fullName}</strong>
                    </div>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="font-size: 11px; color: #B3D4FF;">
                      ${formattedGeneratedAt}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Metric Cards -->
          <tr>
            <td style="padding: 16px 20px 12px 20px; background-color: #FAFBFC; border-bottom: 1px solid #EBECF0;" class="email-metrics-td">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Card 1: Total Overdue -->
                  <td width="33%" class="metric-col" style="padding: 0 4px 0 0;">
                    <div class="metric-box" style="background-color: #FFEBE6; border: 1px solid #FFBDAD; border-radius: 4px; padding: 12px 8px; text-align: center;">
                      <div class="metric-num" style="font-size: 22px; font-weight: 800; color: #DE350B; line-height: 1;">
                        ${metrics.totalOverdue}
                      </div>
                      <div class="metric-txt" style="font-size: 11px; font-weight: 600; color: #DE350B; text-transform: uppercase; margin-top: 4px;">
                        Overdue Tasks
                      </div>
                    </div>
                  </td>

                  <!-- Card 2: High / Critical -->
                  <td width="33%" class="metric-col" style="padding: 0 2px;">
                    <div class="metric-box" style="background-color: #FFF0B3; border: 1px solid #FFE380; border-radius: 4px; padding: 12px 8px; text-align: center;">
                      <div class="metric-num" style="font-size: 22px; font-weight: 800; color: #172B4D; line-height: 1;">
                        ${metrics.criticalCount}
                      </div>
                      <div class="metric-txt" style="font-size: 11px; font-weight: 600; color: #172B4D; text-transform: uppercase; margin-top: 4px;">
                        Critical / High
                      </div>
                    </div>
                  </td>

                  <!-- Card 3: Blockers / Longest -->
                  <td width="33%" class="metric-col" style="padding: 0 0 0 4px;">
                    <div class="metric-box" style="background-color: #EAE6FF; border: 1px solid #C0B6F2; border-radius: 4px; padding: 12px 8px; text-align: center;">
                      <div class="metric-num" style="font-size: 22px; font-weight: 800; color: #403294; line-height: 1;">
                        ${metrics.blockedCount > 0 ? `${metrics.blockedCount} Blocked` : `${metrics.longestOverdueDays}d Max`}
                      </div>
                      <div class="metric-txt" style="font-size: 11px; font-weight: 600; color: #403294; text-transform: uppercase; margin-top: 4px;">
                        ${metrics.blockedCount > 0 ? 'Blocked Tasks' : 'Longest Overdue'}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              ${metrics.criticalCount > 0 ? `
                <div style="margin-top: 10px; background-color: #FFEBE6; border-left: 3px solid #DE350B; padding: 8px 12px; border-radius: 2px; font-size: 12px; color: #BF2600;">
                  ⚠️ <strong>Action Recommended:</strong> You have ${metrics.criticalCount} high-priority or critically overdue tasks requiring immediate status updates or due date adjustments.
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Task List Body Content -->
          <tr>
            <td style="padding: 20px;" class="email-body-td">
              ${projectGroupsHtml}
              ${assigneeSummaryHtml}

              <!-- Primary Call To Action -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #EBECF0; text-align: center;">
                <a href="${baseUrl}/board" target="_blank" style="display: inline-block; background-color: #0052CC; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 4px; margin-right: 8px;">
                  Open Board in Busy
                </a>
                <a href="${baseUrl}/tasks?overdue=true" target="_blank" style="display: inline-block; background-color: #FFFFFF; border: 1px solid #DFE1E6; color: #172B4D; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 4px;">
                  View All Overdue
                </a>
              </div>
            </td>
          </tr>

          <!-- Email Footer -->
          <tr>
            <td style="background-color: #FAFBFC; padding: 20px 24px; border-top: 1px solid #DFE1E6; font-size: 11px; color: #5E6C84; line-height: 1.5; text-align: center;">
              <div>
                This automated digest was generated by <strong>Busy Project & Task Tracking</strong> for <strong>${recipient.email}</strong>.
              </div>
              <div style="margin-top: 6px; color: #6B778C;">
                You are receiving this summary because tasks past their deadlines are assigned to you or exist in projects you manage.
              </div>
              <div style="margin-top: 10px; font-size: 10px; color: #8993A4;">
                Busy v0.1.0 • Atlassian Design System Compliant • Zero Paid Services Architecture
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `
}

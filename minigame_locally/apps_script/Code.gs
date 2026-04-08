var FTB_CONTROL_PANEL_TITLE = 'FTB Control Panel';
var FTB_DEFAULT_LOCAL_SERVER = 'http://127.0.0.1:8080';
var FTB_DEFAULT_README_SHEET = 'README';
var FTB_DEFAULT_PRIMARY_SHEET = 'All Progressions';
var FTB_DEFAULT_MIX_SHEET = 'Mix Planner';
var FTB_DEFAULT_RENAME_SHEET = 'Level Renames';
var FTB_FEEDBACK_TEMPLATE_SHEET = 'Feedback TEMPLATE';
var FTB_FEEDBACK_MASTER_SHEET = 'Feedback Master';
var FTB_FEEDBACK_TRACKING_SHEET = 'Feedback Tracking';
var FTB_FEEDBACK_CHANGELOG_SHEET = 'Feedback Changelog';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('FTB Control Panel')
    .addItem('Open Control Panel', 'showControlPanel')
    .addItem('Refresh Control Panel', 'showControlPanel')
    .addSeparator()
    .addItem('Open README Sheet', 'openReadmeSheet')
    .addItem('Open All Progressions', 'openAllProgressionsSheet')
    .addItem('Open Mix Planner', 'openMixPlannerSheet')
    .addItem('Open Level Renames', 'openLevelRenamesSheet')
    .addSeparator()
    .addItem('Open Feedback Master', 'openFeedbackMasterSheet')
    .addItem('Open Feedback Template', 'openFeedbackTemplateSheet')
    .addItem('Open Feedback Tracking', 'openFeedbackTrackingSheet')
    .addToUi();
  showControlPanel();
}

function showControlPanel() {
  var template = HtmlService.createTemplateFromFile('Sidebar');
  template.bootstrapModel = JSON.stringify(buildSidebarModel_());
  var html = template.evaluate()
    .setTitle(FTB_CONTROL_PANEL_TITLE)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSidebarModel() {
  return buildSidebarModel_();
}

function setPreferredPanel(panelId) {
  PropertiesService.getUserProperties().setProperty('ftb_control_panel_preferred_panel', String(panelId || 'README'));
  return buildSidebarModel_();
}

function openSheetByName(sheetName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  spreadsheet.setActiveSheet(sheet);
  return buildSidebarModel_();
}

function openReadmeSheet() {
  return openSheetByName(FTB_DEFAULT_README_SHEET);
}

function openAllProgressionsSheet() {
  return openSheetByName(FTB_DEFAULT_PRIMARY_SHEET);
}

function openMixPlannerSheet() {
  return openSheetByName(FTB_DEFAULT_MIX_SHEET);
}

function openLevelRenamesSheet() {
  return openSheetByName(FTB_DEFAULT_RENAME_SHEET);
}

function openFeedbackMasterSheet() {
  return openSheetByName(FTB_FEEDBACK_MASTER_SHEET);
}

function openFeedbackTemplateSheet() {
  return openSheetByName(FTB_FEEDBACK_TEMPLATE_SHEET);
}

function openFeedbackTrackingSheet() {
  return openSheetByName(FTB_FEEDBACK_TRACKING_SHEET);
}

function duplicateTemplateForTester(testerName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var template = spreadsheet.getSheetByName(FTB_FEEDBACK_TEMPLATE_SHEET);
  if (!template) {
    throw new Error('Feedback TEMPLATE sheet not found. Run sync-feedback from the toolkit first.');
  }
  var newName = 'Feedback - ' + String(testerName || '').trim();
  var existing = spreadsheet.getSheetByName(newName);
  if (existing) {
    spreadsheet.setActiveSheet(existing);
    return buildSidebarModel_();
  }
  var copy = template.copyTo(spreadsheet);
  copy.setName(newName);
  spreadsheet.setActiveSheet(copy);
  return buildSidebarModel_();
}

function buildSidebarModel_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = spreadsheet.getActiveSheet();
  var activeSheetName = activeSheet ? activeSheet.getName() : '';
  var localServerBaseUrl = readConfig_('FTB_LOCAL_SERVER_BASE_URL', FTB_DEFAULT_LOCAL_SERVER);
  var preferredPanel = PropertiesService.getUserProperties().getProperty('ftb_control_panel_preferred_panel') || '';
  var contextPanel = inferContextPanel_(activeSheetName);
  var selectedPanel = preferredPanel || contextPanel;
  var sheetContracts = buildSheetContracts_();
  var panels = buildPanels_(activeSheetName, localServerBaseUrl);

  if (!panels[selectedPanel]) {
    selectedPanel = contextPanel;
  }

  return {
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    activeSheetName: activeSheetName,
    selectedPanel: selectedPanel,
    contextPanel: contextPanel,
    localServerBaseUrl: localServerBaseUrl,
    sheets: sheetContracts,
    panels: panels
  };
}

function inferContextPanel_(activeSheetName) {
  if (activeSheetName === FTB_DEFAULT_MIX_SHEET) return 'MIX';
  if (activeSheetName === FTB_DEFAULT_PRIMARY_SHEET || activeSheetName === FTB_DEFAULT_RENAME_SHEET) return 'PROGRESSION';
  if (String(activeSheetName || '').toLowerCase().indexOf('playtest') >= 0) return 'PLAYTEST';
  if (String(activeSheetName || '').indexOf('Feedback') >= 0) return 'FEEDBACK';
  if (activeSheetName === FTB_DEFAULT_README_SHEET) return 'README';
  return 'README';
}

function readConfig_(key, fallbackValue) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value ? value : fallbackValue;
}

function buildSheetContracts_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = spreadsheet.getSheets();
  var testerContracts = [];
  for (var i = 0; i < allSheets.length; i++) {
    var name = allSheets[i].getName();
    if (name.indexOf('Feedback - ') === 0) {
      testerContracts.push({
        name: name,
        group: 'interactive',
        editRule: 'Tester fills YES/NO answers and general feedback. Do not edit other testers sheets.'
      });
    }
  }
  return [
    {
      name: FTB_DEFAULT_README_SHEET,
      group: 'read',
      editRule: 'Generated guidance only. Do not edit manually.'
    },
    {
      name: FTB_DEFAULT_PRIMARY_SHEET,
      group: 'interactive',
      editRule: 'Edit only the review columns and use Level Renames for nomenclature changes.'
    },
    {
      name: FTB_DEFAULT_MIX_SHEET,
      group: 'interactive',
      editRule: 'Edit proposal, approval, slot, tutorial, and notes fields only.'
    },
    {
      name: FTB_DEFAULT_RENAME_SHEET,
      group: 'interactive',
      editRule: 'Use this as the staging surface for rename operations.'
    },
    {
      name: 'Level Catalog',
      group: 'data',
      editRule: 'Generated from canonical bundle state. Do not edit manually.'
    },
    {
      name: 'Level Manager state',
      group: 'data',
      editRule: 'Machine-generated sync surface. Do not edit manually.'
    },
    {
      name: 'Procedural learning',
      group: 'data',
      editRule: 'Generated review data. Do not edit manually.'
    },
    {
      name: FTB_FEEDBACK_TEMPLATE_SHEET,
      group: 'interactive',
      editRule: 'Duplicate this sheet for each tester. Do not edit the original directly.'
    },
    {
      name: FTB_FEEDBACK_MASTER_SHEET,
      group: 'data',
      editRule: 'Auto-aggregated from tester sheets. Do not edit manually.'
    },
    {
      name: FTB_FEEDBACK_TRACKING_SHEET,
      group: 'interactive',
      editRule: 'Update version numbers and change notes when tweaking levels.'
    },
    {
      name: FTB_FEEDBACK_CHANGELOG_SHEET,
      group: 'interactive',
      editRule: 'Log all level changes here for audit trail.'
    }
  ].concat(testerContracts);
}

function buildPanels_(activeSheetName, localServerBaseUrl) {
  return {
    README: {
      label: 'README',
      title: 'How this spreadsheet works',
      description: 'Use this panel as the stable guide for what each tab does, which tabs are safe to edit, and when to use the local toolkit.',
      steps: [
        'Open README first when you need orientation.',
        'Green tabs are interactive editorial surfaces.',
        'Blue tabs are guidance or reference.',
        'Orange tabs are generated data and should not be edited manually.',
        'Use Force Sync when you need the canonical workbook and the live Google Sheet to refresh together.'
      ],
      links: [
        { label: 'Open README sheet', mode: 'sheet', sheetName: FTB_DEFAULT_README_SHEET },
        { label: 'Open live spreadsheet', mode: 'external', url: SpreadsheetApp.getActiveSpreadsheet().getUrl() },
        { label: 'Open toolkit', mode: 'external', url: buildActionUrl_(localServerBaseUrl, 'open-toolkit') }
      ]
    },
    LINKS: {
      label: 'Links',
      title: 'Project links',
      description: 'Fast links to the playable build, team board, toolkit, and core spreadsheet actions.',
      links: [
        { label: 'Playable build', mode: 'external', url: 'https://king-ccss-minigame-hungrybears.firebaseapp.com/' },
        { label: 'Team board', mode: 'external', url: 'https://miro.com/app/board/uXjVJTMkKXk=/' },
        { label: 'Open toolkit', mode: 'external', url: buildActionUrl_(localServerBaseUrl, 'open-toolkit') },
        { label: 'Force sync', mode: 'external', url: buildActionUrl_(localServerBaseUrl, 'force-sync') }
      ]
    },
    MIX: {
      label: 'Mix',
      title: 'Mix Planner controls',
      description: activeSheetName === FTB_DEFAULT_MIX_SHEET
        ? 'You are on Mix Planner. Use the buttons below to run the current local actions safely.'
        : 'Open Mix Planner to review or approve Live Ops Mix proposals, then run the local actions below.',
      steps: [
        'Review the proposal row in Mix Planner.',
        'Mark the proposal approved only when the slot composition is correct.',
        'Materialize approved mixes through the local toolkit action.',
        'Use backup and validation before large export changes.'
      ],
      actions: [
        buildActionItem_('Open Mix Planner', 'sheet', '', FTB_DEFAULT_MIX_SHEET),
        buildActionItem_('Force sync', 'external', buildActionUrl_(localServerBaseUrl, 'force-sync')),
        buildActionItem_('Materialize approved mixes', 'external', buildActionUrl_(localServerBaseUrl, 'materialize-mixes')),
        buildActionItem_('Backup progressions', 'external', buildActionUrl_(localServerBaseUrl, 'backup-progressions')),
        buildActionItem_('Validate levels', 'external', buildActionUrl_(localServerBaseUrl, 'validate-levels'))
      ],
      planned: [
        'Per-progression zip export and Drive upload buttons still need dedicated backend endpoints.',
        'Checkbox simulation from the sidebar should be implemented through explicit row actions, not silent sheet mutation.'
      ]
    },
    PLAYTEST: {
      label: 'Playtest',
      title: 'Playtest controls',
      description: 'The repo already exports a canonical playtest summary. The next milestone is turning that data into protected spreadsheet tabs and tester-facing operational flows.',
      steps: [
        'Refresh the canonical playtest export surfaces when local testing changed.',
        'Start a named playtest session for a tester.',
        'Generate summary stats and tweak recommendations.',
        'Use Force Sync when the local toolkit state should overwrite stale live spreadsheet data.'
      ],
      actions: [
        buildActionItem_('Force sync', 'external', buildActionUrl_(localServerBaseUrl, 'force-sync')),
        buildActionItem_('Open toolkit', 'external', buildActionUrl_(localServerBaseUrl, 'open-toolkit'))
      ],
      planned: [
        'Expose the existing playtest summary export as a protected Playtest Summary sheet.',
        'Duplicate Playtest All into tester-specific sessions with a name prompt.',
        'Generate tweak stats and recommendation rows from playtest data.'
      ]
    },
    FEEDBACK: {
      label: 'Feedback',
      title: 'Business Test Feedback',
      description: String(activeSheetName || '').indexOf('Feedback') >= 0
        ? 'You are on a Feedback sheet. Use the controls below to manage tester sheets and review aggregated results.'
        : 'Manage the feedback workflow for the business test. Create tester sheets, sync feedback tabs, and review the Master aggregation.',
      steps: [
        'Run Sync Feedback to create or refresh the 4 feedback tabs from the current level data.',
        'Duplicate the TEMPLATE for each tester using the button below.',
        'Each tester fills their personal sheet with YES/NO answers.',
        'Open Feedback Master to see aggregated results and priority scores.',
        'Use Feedback Tracking to log level version changes.'
      ],
      actions: [
        buildActionItem_('Sync feedback tabs', 'external', buildActionUrl_(localServerBaseUrl, 'sync-feedback')),
        buildActionItem_('Open Feedback Master', 'sheet', '', FTB_FEEDBACK_MASTER_SHEET),
        buildActionItem_('Open Feedback TEMPLATE', 'sheet', '', FTB_FEEDBACK_TEMPLATE_SHEET),
        buildActionItem_('Open Feedback Tracking', 'sheet', '', FTB_FEEDBACK_TRACKING_SHEET),
        buildActionItem_('Duplicate TEMPLATE for tester', 'prompt-tester', '')
      ],
      planned: [
        'Auto-refresh Master formulas when new tester sheets are detected.',
        'Inline priority heatmap highlighting in the Master tab.',
        'Export feedback summary as PDF for stakeholders.'
      ]
    },
    PROGRESSION: {
      label: 'Progression',
      title: 'Progression controls',
      description: activeSheetName === FTB_DEFAULT_PRIMARY_SHEET
        ? 'You are on All Progressions. Use this panel for review, staged renames, and safe bulk naming flows.'
        : 'Use All Progressions as the bulk review surface and Level Renames as the staging surface for naming changes.',
      steps: [
        'Review rows in All Progressions.',
        'Stage naming changes through Level Renames instead of editing generated identity fields directly.',
        'Apply staged renames with the local action once the sheet is ready.',
        'Use Force Sync when you need the sheet to reflect canonical files again.'
      ],
      actions: [
        buildActionItem_('Open All Progressions', 'sheet', '', FTB_DEFAULT_PRIMARY_SHEET),
        buildActionItem_('Open Level Renames', 'sheet', '', FTB_DEFAULT_RENAME_SHEET),
        buildActionItem_('Apply staged renames', 'external', buildActionUrl_(localServerBaseUrl, 'apply-level-renames')),
        buildActionItem_('Force sync', 'external', buildActionUrl_(localServerBaseUrl, 'force-sync'))
      ],
      planned: [
        'Progression export buttons are loaded dynamically from the local toolkit server when it is reachable.',
        'Bulk nomenclature transforms should write into Level Renames as staged data, not directly into generated columns.',
        'Temporary unlock should be limited to explicit editable columns and time-boxed.'
      ]
    }
  };
}

function buildActionItem_(label, mode, url, sheetName) {
  var item = {
    label: label,
    mode: mode
  };
  if (url) item.url = url;
  if (sheetName) item.sheetName = sheetName;
  return item;
}

function buildActionUrl_(baseUrl, actionName) {
  return String(baseUrl || FTB_DEFAULT_LOCAL_SERVER).replace(/\/+$/, '') + '/api/action/' + actionName;
}

import {

  ArrowDownToLine,

  ArrowUpFromLine,

  ArrowLeftRight,

  FileSpreadsheet,

  Receipt,

  TrendingUp,

} from 'lucide-react'



export const REPORT_CATEGORIES = {

  inventory: { id: 'inventory', label: 'Inventory Reports', icon: ArrowDownToLine },

  financial: { id: 'financial', label: 'Financial Reports', icon: TrendingUp },

}



/** Live reports shown in sidebar and Reports Center. Others are kept in code but hidden until backend data exists. */

export const REPORTS = [

  {

    slug: 'general-stock',

    title: 'General Stock Count',

    subtitle: 'Opening / in / out / closing spreadsheet',

    category: 'inventory',

    icon: FileSpreadsheet,

    legacyRoute: true,

    enabled: true,

  },

  {

    slug: 'stock-in',

    title: 'Stock In Report',

    subtitle: 'Fabric receipts and finished uniform registrations',

    category: 'inventory',

    icon: ArrowDownToLine,

    enabled: true,

  },

  {

    slug: 'stock-out',

    title: 'Stock Out Report',

    subtitle: 'Uniform issues and fabric stock-outs',

    category: 'inventory',

    icon: ArrowUpFromLine,

    enabled: true,

  },

  {

    slug: 'stock-movement',

    title: 'Stock Movement Report',

    subtitle: 'Combined audit trail of all movements',

    category: 'inventory',

    icon: ArrowLeftRight,

    enabled: true,

  },

  {

    slug: 'sales-income',

    title: 'Sales & Income Report',

    subtitle: 'Uniform sales during the selected period',

    category: 'financial',

    icon: Receipt,

    enabled: true,

  },

  {

    slug: 'profit-loss',

    title: 'Profit & Loss Report',

    subtitle: 'Finished uniforms and fabric stock — profit or loss per row',

    category: 'financial',

    icon: TrendingUp,

    enabled: true,

  },



  // Hidden until dedicated modules exist (not shown in nav / hub)

  { slug: 'dashboard', title: 'Reports Dashboard', category: 'inventory', enabled: false },

  { slug: 'inventory-stock', title: 'Inventory Stock Report', category: 'inventory', enabled: false },

  { slug: 'inventory-valuation', title: 'Inventory Valuation Report', category: 'inventory', enabled: false },

  { slug: 'low-stock', title: 'Low Stock Report', category: 'inventory', enabled: false },

  { slug: 'expensive-items', title: 'Expensive Items Report', category: 'inventory', enabled: false },

  { slug: 'supplier-purchases', title: 'Supplier Purchase Report', category: 'inventory', enabled: false },

  { slug: 'student-distribution', title: 'Student Uniform Distribution', category: 'inventory', enabled: false },

  { slug: 'returned-uniforms', title: 'Returned Uniform Report', category: 'inventory', enabled: false, placeholder: true },

  { slug: 'damaged-lost', title: 'Damaged / Lost Report', category: 'inventory', enabled: false, placeholder: true },

  { slug: 'inventory-adjustments', title: 'Inventory Adjustment Report', category: 'inventory', enabled: false, placeholder: true },

  { slug: 'monthly-summary', title: 'Monthly Inventory Summary', category: 'inventory', enabled: false },

  { slug: 'inventory-value', title: 'Inventory Value Report', category: 'financial', enabled: false },

  { slug: 'cogs', title: 'Cost of Goods Sold', category: 'financial', enabled: false, placeholder: true },

  { slug: 'expenses', title: 'Expenses Report', category: 'financial', enabled: false, placeholder: true },

  { slug: 'daily-income', title: 'Daily Income Report', category: 'financial', enabled: false },

  { slug: 'monthly-financial', title: 'Monthly Financial Summary', category: 'financial', enabled: false },

  { slug: 'best-selling', title: 'Best Selling Uniform Report', category: 'financial', enabled: false },

  { slug: 'slow-moving', title: 'Unsold / Slow Moving Items', category: 'financial', enabled: false },

  { slug: 'payment-methods', title: 'Income by Payment Method', category: 'financial', enabled: false, placeholder: true },

  { slug: 'student-debt', title: 'Student Debt Report', category: 'financial', enabled: false, placeholder: true },

  { slug: 'financial-dashboard', title: 'Financial Dashboard', category: 'financial', enabled: false },

]



export const VISIBLE_REPORTS = REPORTS.filter((r) => r.enabled !== false)



export function getReportBySlug(slug) {

  return REPORTS.find((r) => r.slug === slug) || null

}



export function reportsByCategory(categoryId) {

  return VISIBLE_REPORTS.filter((r) => r.category === categoryId)

}



export const INVENTORY_REPORTS = reportsByCategory('inventory')

export const FINANCIAL_REPORTS = reportsByCategory('financial')



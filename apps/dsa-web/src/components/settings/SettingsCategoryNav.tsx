import type React from 'react';
import { getCategoryDescriptionZh, getCategoryTitleZh } from '../../utils/systemConfigI18n';
import type { SystemConfigCategorySchema } from '../../types/systemConfig';
import { cn } from '../../utils/cn';

interface SettingsCategoryNavProps {
  categories: SystemConfigCategorySchema[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export const SettingsCategoryNav: React.FC<SettingsCategoryNavProps> = ({
  categories,
  activeCategory,
  onSelect,
}) => {
  return (
    <div className="h-full rounded-[1.5rem] border settings-border bg-card/94 p-4 shadow-soft-card-strong backdrop-blur-sm">
      <div className="mb-4">
        <p className="settings-accent-text text-xs font-semibold uppercase tracking-[0.3em]">配置分类</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-text">按模块整理系统设置与认证能力。</p>
      </div>

      <div className="space-y-2.5">
        {categories.map((category) => {
          const isActive = category.category === activeCategory;
          const title = getCategoryTitleZh(category.category, category.title);
          const description = getCategoryDescriptionZh(category.category, category.description);

          return (
            <button
              key={category.category}
              type="button"
              className={cn(
                'w-full rounded-[1.1rem] border px-3 py-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200',
                isActive
                  ? 'settings-nav-item-active'
                  : 'border-[var(--settings-border)] bg-[var(--settings-surface)] hover:border-[hsl(var(--primary)/0.32)] hover:bg-[hsl(var(--primary)/0.045)]',
              )}
              onClick={() => onSelect(category.category)}
            >
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold tracking-tight', isActive ? 'text-foreground' : 'text-secondary-text')}>
                  {title}
                </p>
                {description ? (
                  <p className={cn('mt-1 line-clamp-2 text-xs leading-5', isActive ? 'text-secondary-text' : 'text-muted-text')}>{description}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

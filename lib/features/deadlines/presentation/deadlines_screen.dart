import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import 'package:haptic_feedback/haptic_feedback.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';
import '../../auth/presentation/auth_notifier.dart';
import 'deadlines_provider.dart';

class DeadlinesScreen extends ConsumerStatefulWidget {
  const DeadlinesScreen({super.key});

  @override
  ConsumerState<DeadlinesScreen> createState() => _DeadlinesScreenState();
}

class _DeadlinesScreenState extends ConsumerState<DeadlinesScreen> {
  String _searchQuery = '';
  String _selectedPriority = 'ALL';
  String _selectedDepartmentId = 'ALL';
  bool _showCompleted = false;

  @override
  Widget build(BuildContext context) {
    final deadlinesState = ref.watch(deadlinesProvider);
    final departmentsState = ref.watch(departmentsProvider);
    final authState = ref.watch(authNotifierProvider);
    final currentUser = authState.user;
    
    final isFaculty = currentUser?.role == 'FACULTY';
    final userDeptId = currentUser?.departmentId;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Academic Deadlines',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Filter Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Column(
              children: [
                // Search Field
                TextField(
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search deadlines...',
                    prefixIcon: const Icon(Icons.search, color: AppTheme.primary),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                
                // Filters Row
                Row(
                  children: [
                    // Priority Filter
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedPriority,
                            isExpanded: true,
                            items: const [
                              DropdownMenuItem(value: 'ALL', child: Text('All Priorities')),
                              DropdownMenuItem(value: 'HIGH', child: Text('High')),
                              DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                              DropdownMenuItem(value: 'LOW', child: Text('Low')),
                            ],
                            onChanged: (val) {
                              setState(() {
                                _selectedPriority = val ?? 'ALL';
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                    
                    // Department Filter (only active/visible if user is not Faculty)
                    if (!isFaculty) ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: departmentsState.maybeWhen(
                              data: (depts) {
                                return DropdownButton<String>(
                                  value: _selectedDepartmentId,
                                  isExpanded: true,
                                  items: [
                                    const DropdownMenuItem(value: 'ALL', child: Text('All Depts')),
                                    ...depts.map((d) => DropdownMenuItem(value: d.id, child: Text(d.code))),
                                  ],
                                  onChanged: (val) {
                                    setState(() {
                                      _selectedDepartmentId = val ?? 'ALL';
                                    });
                                  },
                                );
                              },
                              orElse: () => const Center(
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                
                // Show completed Switch
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Show Completed & Cancelled',
                      style: TextStyle(fontSize: 13, color: AppTheme.darkBlue, fontWeight: FontWeight.w500),
                    ),
                    Switch(
                      value: _showCompleted,
                      activeThumbColor: AppTheme.primary,
                      onChanged: (val) {
                        setState(() {
                          _showCompleted = val;
                        });
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Deadlines List
          Expanded(
            child: deadlinesState.when(
              data: (deadlines) {
                // Apply filters
                var filtered = deadlines.where((d) {
                  final matchesSearch = d.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                      d.description.toLowerCase().contains(_searchQuery.toLowerCase());
                  
                  final matchesPriority = _selectedPriority == 'ALL' || d.priority == _selectedPriority;
                  
                  final matchesDept = isFaculty
                      ? (d.departmentId == userDeptId)
                      : (_selectedDepartmentId == 'ALL' || d.departmentId == _selectedDepartmentId);
                      
                  final matchesCompleted = _showCompleted ? true : (d.status == 'ACTIVE');

                  return matchesSearch && matchesPriority && matchesDept && matchesCompleted;
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          'No deadlines found',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 16, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(deadlinesProvider.notifier).fetchDeadlines(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final deadline = filtered[idx];
                      return _buildDeadlineCard(context, deadline, currentUser?.id == deadline.createdById || !isFaculty);
                    },
                  ),
                );
              },
              error: (err, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load deadlines: $err',
                      style: const TextStyle(color: AppTheme.error),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => ref.read(deadlinesProvider.notifier).fetchDeadlines(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showDeadlineModal(context, null),
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildDeadlineCard(BuildContext context, Deadline deadline, bool canManage) {
    Color priorityColor;
    Color priorityBg;
    
    switch (deadline.priority) {
      case 'HIGH':
        priorityColor = Colors.red.shade700;
        priorityBg = Colors.red.shade50;
        break;
      case 'MEDIUM':
        priorityColor = Colors.amber.shade800;
        priorityBg = Colors.amber.shade50;
        break;
      default:
        priorityColor = Colors.green.shade700;
        priorityBg = Colors.green.shade50;
    }

    final dateString = DateFormat('MMM dd, yyyy - hh:mm a').format(deadline.dueDate.toLocal());
    final isOverdue = deadline.dueDate.isBefore(DateTime.now()) && deadline.status == 'ACTIVE';
    final isCompleted = deadline.status == 'COMPLETED';
    final isCancelled = deadline.status == 'CANCELLED';

    Color cardBgColor = Colors.white;
    if (isCompleted) {
      cardBgColor = Colors.green.shade50.withValues(alpha: 0.15);
    } else if (isCancelled) {
      cardBgColor = Colors.grey.shade100;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Opacity(
        opacity: isCancelled ? 0.6 : 1.0,
        child: GlassCard(
          backgroundColor: cardBgColor,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Priority & Status Badges
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: priorityBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          deadline.priority,
                          style: TextStyle(
                            color: priorityColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isCancelled 
                              ? Colors.grey.shade200 
                              : (isCompleted ? Colors.green.shade100 : Colors.blue.shade50),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          deadline.status,
                          style: TextStyle(
                            color: isCancelled 
                                ? Colors.grey.shade700 
                                : (isCompleted ? Colors.green.shade800 : Colors.blue.shade800),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  // Due Date text
                  Row(
                    children: [
                      if (isOverdue)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(Icons.warning_amber_rounded, size: 14, color: AppTheme.error),
                        ),
                      Text(
                        dateString,
                        style: TextStyle(
                          color: isOverdue ? AppTheme.error : Colors.black54,
                          fontSize: 11,
                          fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              
              // Title and Description
              Text(
                deadline.title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.darkBlue,
                  decoration: isCompleted 
                      ? TextDecoration.lineThrough 
                      : (isCancelled ? TextDecoration.lineThrough : null),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                deadline.description,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              
              // Info Row: Department, CreatedBy, Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (deadline.departmentName != null)
                          Text(
                            'Dept: ${deadline.departmentName}',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                          ),
                        if (deadline.createdByFullName != null)
                          Text(
                            'By: ${deadline.createdByFullName}',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                          ),
                      ],
                    ),
                  ),
                  
                  // Actions Button or Completion Toggle
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Completed status checkbox
                      if (!isCancelled)
                        Checkbox(
                          value: isCompleted,
                          activeColor: Colors.green,
                          onChanged: (val) {
                            if (val != null) {
                              ref.read(deadlinesProvider.notifier).updateDeadline(
                                deadline.id,
                                {'status': val ? 'COMPLETED' : 'ACTIVE'},
                              );
                            }
                          },
                        ),
                      if (canManage && !isCancelled && !isCompleted)
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, color: AppTheme.primary, size: 18),
                          onPressed: () => _showDeadlineModal(context, deadline),
                        ),
                      if (canManage)
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppTheme.error, size: 18),
                          onPressed: () => _showDeleteConfirm(context, deadline.id),
                        ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteConfirm(BuildContext context, String deadlineId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Deadline'),
        content: const Text('Are you sure you want to permanently delete this deadline? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              try {
                await ref.read(deadlinesProvider.notifier).deleteDeadline(deadlineId);
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Deadline deleted successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
                if (await Haptics.canVibrate()) {
                  await Haptics.vibrate(HapticsType.warning);
                }
              } catch (e) {
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text('Failed to delete deadline: $e'),
                    backgroundColor: AppTheme.error,
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showDeadlineModal(BuildContext context, Deadline? existing) {
    final formKey = GlobalKey<FormState>();
    final titleController = TextEditingController(text: existing?.title ?? '');
    final descController = TextEditingController(text: existing?.description ?? '');
    DateTime selectedDate = existing?.dueDate ?? DateTime.now().add(const Duration(days: 1));
    String priority = existing?.priority ?? 'HIGH';
    bool addToGoogleCalendar = false;
    
    // Default reminder settings: all checked
    bool remind1Day = true;
    bool remind6Hours = true;
    bool remind1Hour = true;
    
    final authState = ref.read(authNotifierProvider);
    final isFaculty = authState.user?.role == 'FACULTY';
    final userDeptId = authState.user?.departmentId;
    
    String departmentId = existing?.departmentId ?? 
                          (isFaculty ? (userDeptId ?? '') : 'ALL');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final deptsAsync = ref.watch(departmentsProvider);
            
            if (departmentId == 'ALL' && deptsAsync.value != null && deptsAsync.value!.isNotEmpty) {
              departmentId = deptsAsync.value!.first.id;
            }

            // Adjust height dynamically to accommodate keyboards
            final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
            final sheetHeight = MediaQuery.of(context).size.height * 0.88;

            return Container(
              height: sheetHeight,
              margin: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SafeArea(
                child: Column(
                  children: [
                    // Header Bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            existing == null ? 'Create New Deadline' : 'Edit Deadline',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.darkBlue,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    
                    // Form Content Scrollable
                    Expanded(
                      child: Form(
                        key: formKey,
                        child: SingleChildScrollView(
                          padding: EdgeInsets.only(
                            left: 20,
                            right: 20,
                            top: 16,
                            bottom: keyboardHeight + 32,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // 1. Title Input
                              TextFormField(
                                controller: titleController,
                                decoration: InputDecoration(
                                  labelText: 'Deadline Title',
                                  hintText: 'e.g. CIA 3 Marks Submission',
                                  filled: true,
                                  fillColor: Colors.grey.shade50,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                validator: (value) =>
                                    value == null || value.trim().isEmpty ? 'Please enter a title' : null,
                              ),
                              const SizedBox(height: 14),
                              
                              // 2. Description Input
                              TextFormField(
                                controller: descController,
                                maxLines: 3,
                                decoration: InputDecoration(
                                  labelText: 'Description / Notes',
                                  hintText: 'Add detail instructions here...',
                                  filled: true,
                                  fillColor: Colors.grey.shade50,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                validator: (value) =>
                                    value == null || value.trim().isEmpty ? 'Please enter description' : null,
                              ),
                              const SizedBox(height: 14),
                              
                              // 3. Priority (and target department in side-by-side layout if not Faculty)
                              Row(
                                children: [
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      initialValue: priority,
                                      decoration: InputDecoration(
                                        labelText: 'Priority',
                                        filled: true,
                                        fillColor: Colors.grey.shade50,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: 'HIGH', child: Text('High')),
                                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                                        DropdownMenuItem(value: 'LOW', child: Text('Low')),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) {
                                          setModalState(() {
                                            priority = val;
                                          });
                                        }
                                      },
                                    ),
                                  ),
                                  if (!isFaculty) ...[
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: deptsAsync.when(
                                        data: (depts) {
                                          return DropdownButtonFormField<String>(
                                            initialValue: depts.any((d) => d.id == departmentId) ? departmentId : depts.first.id,
                                            decoration: InputDecoration(
                                              labelText: 'Department',
                                              filled: true,
                                              fillColor: Colors.grey.shade50,
                                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                            ),
                                            items: depts.map((d) {
                                              return DropdownMenuItem(
                                                value: d.id,
                                                child: Text(d.code),
                                              );
                                            }).toList(),
                                            onChanged: (val) {
                                              if (val != null) {
                                                setModalState(() {
                                                  departmentId = val;
                                                });
                                              }
                                            },
                                          );
                                        },
                                        loading: () => const Center(child: CircularProgressIndicator()),
                                        error: (e, s) => Text('Error: $e'),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 14),

                              // 4. Due Date Picker Button Card
                              InkWell(
                                onTap: () async {
                                  final pickedDate = await showDatePicker(
                                    context: context,
                                    initialDate: selectedDate,
                                    firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                    lastDate: DateTime.now().add(const Duration(days: 365)),
                                  );
                                  if (pickedDate != null) {
                                    if (!context.mounted) return;
                                    final pickedTime = await showTimePicker(
                                      context: context,
                                      initialTime: TimeOfDay.fromDateTime(selectedDate),
                                    );
                                    if (pickedTime != null) {
                                      setModalState(() {
                                        selectedDate = DateTime(
                                          pickedDate.year,
                                          pickedDate.month,
                                          pickedDate.day,
                                          pickedTime.hour,
                                          pickedTime.minute,
                                        );
                                      });
                                    }
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.grey.shade400),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('Due Date & Time', style: TextStyle(color: Colors.black54, fontSize: 11)),
                                          const SizedBox(height: 4),
                                          Text(
                                            DateFormat('EEE, MMM dd, yyyy - hh:mm a').format(selectedDate.toLocal()),
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.darkBlue),
                                          ),
                                        ],
                                      ),
                                      const Icon(Icons.calendar_today, color: AppTheme.primary, size: 20),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),

                              // 5. Reminder Settings Group Card
                              if (existing == null) ...[
                                Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(alpha: 0.02),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.1)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.alarm, color: AppTheme.primary, size: 18),
                                          SizedBox(width: 6),
                                          Text(
                                            'Reminder Notifications',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.darkBlue),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                                        children: [
                                          FilterChip(
                                            label: const Text('1 Day'),
                                            selected: remind1Day,
                                            onSelected: (val) {
                                              setModalState(() {
                                                remind1Day = val;
                                              });
                                            },
                                          ),
                                          FilterChip(
                                            label: const Text('6 Hours'),
                                            selected: remind6Hours,
                                            onSelected: (val) {
                                              setModalState(() {
                                                remind6Hours = val;
                                              });
                                            },
                                          ),
                                          FilterChip(
                                            label: const Text('1 Hour'),
                                            selected: remind1Hour,
                                            onSelected: (val) {
                                              setModalState(() {
                                                remind1Hour = val;
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],

                              // 6. Google Calendar Sync Toggle
                              if (existing == null) ...[
                                SwitchListTile(
                                  title: const Text('Add to Google Calendar', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  subtitle: const Text('Sync this deadline to your Google Calendar', style: TextStyle(fontSize: 11)),
                                  contentPadding: EdgeInsets.zero,
                                  value: addToGoogleCalendar,
                                  activeThumbColor: AppTheme.primary,
                                  onChanged: (val) {
                                    setModalState(() {
                                      addToGoogleCalendar = val;
                                    });
                                  },
                                ),
                                const SizedBox(height: 12),
                              ],

                              // 7. Cancel Option (Visible when editing ACTIVE deadline)
                              if (existing != null && existing.status == 'ACTIVE') ...[
                                SizedBox(
                                  width: double.infinity,
                                  height: 48,
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppTheme.error,
                                      side: const BorderSide(color: AppTheme.error),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    icon: const Icon(Icons.cancel_outlined, size: 18),
                                    label: const Text('Cancel This Deadline', style: TextStyle(fontWeight: FontWeight.bold)),
                                    onPressed: () async {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (ctx) => AlertDialog(
                                          title: const Text('Cancel Deadline'),
                                          content: const Text('Are you sure you want to mark this deadline as CANCELLED? This will delete all pending reminders and schedule items.'),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(ctx, false),
                                              child: const Text('No'),
                                            ),
                                            TextButton(
                                              onPressed: () => Navigator.pop(ctx, true),
                                              child: const Text('Yes, Cancel'),
                                            ),
                                          ],
                                        ),
                                      );

                                      if (confirm == true) {
                                        try {
                                          await ref.read(deadlinesProvider.notifier).updateDeadline(
                                            existing.id,
                                            {'status': 'CANCELLED'},
                                          );
                                          if (ctx.mounted) {
                                            Navigator.pop(ctx);
                                          }
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text('Cancellation failed: $e')),
                                            );
                                          }
                                        }
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(height: 20),
                              ],

                              // 8. Submit Button
                              SizedBox(
                                width: double.infinity,
                                height: 50,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primary,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: () async {
                                    if (formKey.currentState?.validate() ?? false) {
                                      if (isFaculty && (userDeptId == null || userDeptId.isEmpty)) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Error: Faculty profile lacks department configuration.')),
                                        );
                                        return;
                                      }
                                      
                                      final finalDeptId = isFaculty ? userDeptId! : departmentId;
                                      
                                      // Package reminder settings keys
                                      final List<String> reminderSettings = [];
                                      if (remind1Day) reminderSettings.add('24_HOURS');
                                      if (remind6Hours) reminderSettings.add('6_HOURS');
                                      if (remind1Hour) reminderSettings.add('1_HOUR');

                                      try {
                                        if (existing == null) {
                                          await ref.read(deadlinesProvider.notifier).createDeadline(
                                            title: titleController.text.trim(),
                                            description: descController.text.trim(),
                                            dueDate: selectedDate,
                                            priority: priority,
                                            departmentId: finalDeptId,
                                            addToGoogleCalendar: addToGoogleCalendar,
                                            reminderSettings: reminderSettings,
                                          );
                                          try {
                                            if (await Haptics.canVibrate()) {
                                              await Haptics.vibrate(HapticsType.success);
                                            }
                                          } catch (_) {}
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text('Deadline created successfully!'),
                                                backgroundColor: Colors.green,
                                              ),
                                            );
                                          }
                                        } else {
                                          await ref.read(deadlinesProvider.notifier).updateDeadline(
                                            existing.id,
                                            {
                                              'title': titleController.text.trim(),
                                              'description': descController.text.trim(),
                                              'dueDate': selectedDate.toIso8601String(),
                                              'priority': priority,
                                              'departmentId': finalDeptId,
                                            },
                                          );
                                          try {
                                            if (await Haptics.canVibrate()) {
                                              await Haptics.vibrate(HapticsType.success);
                                            }
                                          } catch (_) {}
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text('Deadline updated successfully!'),
                                                backgroundColor: Colors.green,
                                              ),
                                            );
                                          }
                                        }
                                        if (ctx.mounted) {
                                          Navigator.pop(ctx);
                                        }
                                      } catch (e) {
                                        if (context.mounted) {
                                          String readableError = e.toString();
                                          if (e is DioException) {
                                            final data = e.response?.data;
                                            if (data is Map<String, dynamic>) {
                                              final errorMsg = data['error'];
                                              if (errorMsg != null) {
                                                readableError = errorMsg.toString();
                                              }
                                            }
                                          }
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text('Operation failed: $readableError'),
                                              backgroundColor: AppTheme.error,
                                              behavior: SnackBarBehavior.floating,
                                            ),
                                          );
                                        }
                                      }
                                    }
                                  },
                                  child: Text(
                                    existing == null ? 'Create Deadline' : 'Save Changes',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
